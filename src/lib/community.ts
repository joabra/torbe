import { prisma } from "@/lib/prisma";

export type PollArchiveItem = {
  pollId: string;
  question: string;
  winnerLabel: string;
  winnerVotes: number;
  totalVotes: number;
  createdAt: string;
};

export type PollArchiveYear = {
  yearKey: string;
  yearLabel: string;
  polls: number;
  totalVotes: number;
  winners: PollArchiveItem[];
};

function getYearKey(date: Date) {
  return `${date.getFullYear()}`;
}

function getYearLabel(date: Date) {
  return date.getFullYear().toString();
}

export async function getPollArchive(limitYears = 6): Promise<PollArchiveYear[]> {
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

  const grouped = new Map<string, PollArchiveYear>();

  for (const poll of polls) {
    const yearKey = getYearKey(poll.createdAt);
    if (!grouped.has(yearKey)) {
      grouped.set(yearKey, {
        yearKey,
        yearLabel: getYearLabel(poll.createdAt),
        polls: 0,
        totalVotes: 0,
        winners: [],
      });
    }

    const year = grouped.get(yearKey)!;
    const options = poll.options.map((option) => ({
      id: option.id,
      text: option.text,
      votes: option._count.votes,
    }));

    const totalVotes = options.reduce((sum, option) => sum + option.votes, 0);
    const maxVotes = options.reduce((max, option) => Math.max(max, option.votes), 0);
    const winnerOptions = maxVotes > 0 ? options.filter((option) => option.votes === maxVotes) : [];

    year.polls += 1;
    year.totalVotes += totalVotes;
    year.winners.push({
      pollId: poll.id,
      question: poll.question,
      winnerLabel: winnerOptions.length > 0 ? winnerOptions.map((o) => o.text).join(" / ") : "Inga röster",
      winnerVotes: maxVotes,
      totalVotes,
      createdAt: poll.createdAt.toISOString(),
    });
  }

  return Array.from(grouped.values()).slice(0, limitYears);
}
