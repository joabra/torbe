import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CommunityClient } from "@/components/CommunityClient";
import { getPollArchive, type PollArchiveMonth } from "@/lib/community";

export const dynamic = "force-dynamic";

type LeaderboardResponse = {
  month: string;
  topTips: Array<{
    id: string;
    title: string;
    category: string;
    votesThisMonth: number;
    createdBy: string | null;
  }>;
  topContributors: Array<{
    id: string;
    name: string;
    tips: number;
    photos: number;
    guestbook: number;
    total: number;
  }>;
};

type SupportMessage = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; role: "USER" | "ADMIN" } | null;
};

type Poll = {
  id: string;
  question: string;
  description: string | null;
  status: "ACTIVE" | "CLOSED";
  closesAt: string | null;
  createdAt: string;
  createdBy: string | null;
  totalVotes: number;
  myVoteOptionId: string | null;
  options: Array<{ id: string; text: string; votes: number }>;
};

async function getLeaderboard(): Promise<LeaderboardResponse> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthlyTipVotes, contributorUsers] = await Promise.all([
    prisma.tipVote.groupBy({
      by: ["tipId"],
      where: { createdAt: { gte: monthStart } },
      _count: { tipId: true },
      orderBy: { _count: { tipId: "desc" } },
      take: 5,
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { tips: { some: { createdAt: { gte: monthStart } } } },
          { visitPhotos: { some: { createdAt: { gte: monthStart } } } },
          { guestbookEntries: { some: { createdAt: { gte: monthStart } } } },
        ],
      },
      select: {
        id: true,
        name: true,
        tips: { where: { createdAt: { gte: monthStart } }, select: { id: true } },
        visitPhotos: { where: { createdAt: { gte: monthStart } }, select: { id: true } },
        guestbookEntries: { where: { createdAt: { gte: monthStart } }, select: { id: true } },
      },
    }),
  ]);

  const tips = monthlyTipVotes.length
    ? await prisma.tip.findMany({
        where: { id: { in: monthlyTipVotes.map((v) => v.tipId) } },
        select: { id: true, title: true, category: true, createdBy: { select: { name: true } } },
      })
    : [];

  const tipMap = new Map(tips.map((t) => [t.id, t]));
  const topTips = monthlyTipVotes
    .map((voteRow) => {
      const tip = tipMap.get(voteRow.tipId);
      if (!tip) return null;
      return {
        id: tip.id,
        title: tip.title,
        category: tip.category,
        votesThisMonth: voteRow._count.tipId,
        createdBy: tip.createdBy?.name ?? null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const topContributors = contributorUsers
    .map((u) => {
      const tips = u.tips.length;
      const photos = u.visitPhotos.length;
      const guestbook = u.guestbookEntries.length;
      const total = tips + photos + guestbook;
      return {
        id: u.id,
        name: u.name,
        tips,
        photos,
        guestbook,
        total,
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`,
    topTips,
    topContributors,
  };
}

async function getSupportMessages(): Promise<SupportMessage[]> {
  const messages = await prisma.supportMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { author: { select: { id: true, name: true, role: true } } },
  });

  return messages.reverse().map((message) => ({
    id: message.id,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    author: message.author,
  }));
}

async function getPolls(userId: string | null): Promise<Poll[]> {
  const polls = await prisma.poll.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 20,
    include: {
      createdBy: { select: { name: true } },
      options: {
        include: {
          _count: { select: { votes: true } },
        },
      },
      votes: userId ? { where: { userId }, select: { optionId: true }, take: 1 } : false,
      _count: { select: { votes: true } },
    },
  });

  return polls.map((poll) => ({
    id: poll.id,
    question: poll.question,
    description: poll.description,
    status: poll.status,
    closesAt: poll.closesAt ? poll.closesAt.toISOString() : null,
    createdAt: poll.createdAt.toISOString(),
    createdBy: poll.createdBy?.name ?? null,
    totalVotes: poll._count.votes,
    myVoteOptionId: userId && Array.isArray(poll.votes) && poll.votes.length > 0 ? poll.votes[0].optionId : null,
    options: poll.options.map((opt) => ({
      id: opt.id,
      text: opt.text,
      votes: opt._count.votes,
    })),
  }));
}

export default async function CommunityPage() {
  const session = await auth();
  const userId = session?.user ? (session.user as { id: string }).id : null;

  const [initialLeaderboard, initialMessages, initialPolls, initialPollArchive] = await Promise.all([
    getLeaderboard(),
    getSupportMessages(),
    getPolls(userId),
    getPollArchive(6),
  ]);

  return (
    <CommunityClient
      initialLeaderboard={initialLeaderboard}
      initialMessages={initialMessages}
      initialPolls={initialPolls}
      initialPollArchive={initialPollArchive as PollArchiveMonth[]}
    />
  );
}
