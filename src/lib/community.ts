import { prisma } from "@/lib/prisma";

export type PollArchiveItem = {
  pollId: string;
  question: string;
  winnerLabel: string;
  winnerVotes: number;
  totalVotes: number;
  createdAt: string;
};

export type PollArchiveMonth = {
  monthKey: string;
  monthLabel: string;
  polls: number;
  totalVotes: number;
  winners: PollArchiveItem[];
};

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(date: Date) {
  return date.toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
}

export async function getPollArchive(limitMonths = 6): Promise<PollArchiveMonth[]> {
  const polls = await prisma.poll.findMany({
    where: {
      OR: [
        { status: "CLOSED" },
        { closesAt: { lt: new Date() } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 120,
    include: {
      options: {
        include: {
          _count: { select: { votes: true } },
        },
      },
    },
  });

  const grouped = new Map<string, PollArchiveMonth>();

  for (const poll of polls) {
    const monthKey = getMonthKey(poll.createdAt);
    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, {
        monthKey,
        monthLabel: getMonthLabel(poll.createdAt),
        polls: 0,
        totalVotes: 0,
        winners: [],
      });
    }

    const month = grouped.get(monthKey)!;
    const options = poll.options.map((option) => ({
      id: option.id,
      text: option.text,
      votes: option._count.votes,
    }));

    const totalVotes = options.reduce((sum, option) => sum + option.votes, 0);
    const maxVotes = options.reduce((max, option) => Math.max(max, option.votes), 0);
    const winnerOptions = maxVotes > 0 ? options.filter((option) => option.votes === maxVotes) : [];

    month.polls += 1;
    month.totalVotes += totalVotes;
    month.winners.push({
      pollId: poll.id,
      question: poll.question,
      winnerLabel: winnerOptions.length > 0 ? winnerOptions.map((o) => o.text).join(" / ") : "Inga röster",
      winnerVotes: maxVotes,
      totalVotes,
      createdAt: poll.createdAt.toISOString(),
    });
  }

  return Array.from(grouped.values()).slice(0, limitMonths);
}
