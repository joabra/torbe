"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { BarChart3, MessageCircle, Send, Trophy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { categoryLabel, formatDateShort } from "@/lib/utils";

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

type PollArchiveMonth = {
  monthKey: string;
  monthLabel: string;
  polls: number;
  totalVotes: number;
  winners: Array<{
    pollId: string;
    question: string;
    winnerLabel: string;
    winnerVotes: number;
    totalVotes: number;
    createdAt: string;
  }>;
};

interface CommunityClientProps {
  initialLeaderboard: LeaderboardResponse;
  initialMessages: SupportMessage[];
  initialPolls: Poll[];
  initialPollArchive: PollArchiveMonth[];
}

export function CommunityClient({ initialLeaderboard, initialMessages, initialPolls, initialPollArchive }: CommunityClientProps) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  const [leaderboard] = useState<LeaderboardResponse>(initialLeaderboard);
  const [messages, setMessages] = useState<SupportMessage[]>(initialMessages);
  const [polls, setPolls] = useState<Poll[]>(initialPolls);
  const [pollArchive, setPollArchive] = useState<PollArchiveMonth[]>(initialPollArchive);

  const [supportDraft, setSupportDraft] = useState("");
  const [supportSending, setSupportSending] = useState(false);
  const [supportError, setSupportError] = useState("");

  const [pollQuestion, setPollQuestion] = useState("");
  const [pollDescription, setPollDescription] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollSubmitting, setPollSubmitting] = useState(false);
  const [pollError, setPollError] = useState("");
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
  const [statusUpdatingPollId, setStatusUpdatingPollId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);

  const monthLabel = useMemo(() => {
    if (!leaderboard?.month) return "denna månad";
    const [year, month] = leaderboard.month.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
  }, [leaderboard]);

  async function refreshPolls() {
    const res = await fetch("/api/community/polls");
    if (res.ok) {
      setPolls(await res.json());
    }
  }

  async function refreshPollArchive() {
    const res = await fetch("/api/community/polls/archive");
    if (res.ok) {
      setPollArchive(await res.json());
    }
  }

  async function submitSupportMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!supportDraft.trim()) return;

    setSupportSending(true);
    setSupportError("");
    const res = await fetch("/api/community/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: supportDraft.trim() }),
    });

    if (res.ok) {
      const created: SupportMessage = await res.json();
      setMessages((prev) => [...prev, created]);
      setSupportDraft("");
    } else {
      const data = await res.json().catch(() => ({}));
      setSupportError(data.error ?? "Kunde inte skicka meddelandet");
    }
    setSupportSending(false);
  }

  function updatePollOption(index: number, value: string) {
    setPollOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  }

  async function createPoll(e: React.FormEvent) {
    e.preventDefault();
    setPollSubmitting(true);
    setPollError("");

    const payload = {
      question: pollQuestion,
      description: pollDescription || undefined,
      options: pollOptions,
    };

    const res = await fetch("/api/community/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setPollQuestion("");
      setPollDescription("");
      setPollOptions(["", ""]);
      await Promise.all([refreshPolls(), refreshPollArchive()]);
    } else {
      const data = await res.json().catch(() => ({}));
      setPollError(data.error ?? "Kunde inte skapa omröstning");
    }

    setPollSubmitting(false);
  }

  async function vote(pollId: string, optionId: string) {
    setVotingPollId(pollId);
    const res = await fetch(`/api/community/polls/${pollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId }),
    });

    if (res.ok) {
      const data = await res.json();
      setPolls((prev) =>
        prev.map((poll) => {
          if (poll.id !== pollId) return poll;
          const updatedOptions = poll.options.map((opt) => {
            const fresh = data.options.find((o: { id: string; votes: number }) => o.id === opt.id);
            return fresh ? { ...opt, votes: fresh.votes } : opt;
          });
          const totalVotes = updatedOptions.reduce((sum, option) => sum + option.votes, 0);
          return {
            ...poll,
            options: updatedOptions,
            totalVotes,
            myVoteOptionId: data.myVoteOptionId,
          };
        })
      );
    }
    setVotingPollId(null);
  }

  async function setPollStatus(pollId: string, status: "ACTIVE" | "CLOSED") {
    setStatusUpdatingPollId(pollId);
    const res = await fetch(`/api/community/polls/${pollId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (res.ok) {
      setPolls((prev) => prev.map((poll) => (poll.id === pollId ? { ...poll, status } : poll)));
      await refreshPollArchive();
    }
    setStatusUpdatingPollId(null);
  }

  async function deleteSupportMessage(messageId: string) {
    setDeletingMessageId(messageId);
    const res = await fetch(`/api/community/support/${messageId}`, { method: "DELETE" });
    if (res.ok) {
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
    }
    setDeletingMessageId(null);
  }

  return (
    <div className="min-h-screen bg-sand-50 px-4 py-28">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-forest-900">Familjens hubb</h1>
          <p className="text-stone-600 mt-2">Topplistor, snabb support och omröstningar på ett ställe</p>
        </div>

        <section className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-forest-800 font-semibold">
                <Trophy className="w-4 h-4" />
                Mest gillade tips ({monthLabel})
              </div>
              <Link href="/aktiviteter" className="text-xs text-forest-700 hover:underline">Se alla tips</Link>
            </CardHeader>
            <CardBody className="space-y-3">
              {leaderboard?.topTips.length ? (
                leaderboard.topTips.map((tip, idx) => (
                  <div key={tip.id} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-stone-800">#{idx + 1} {tip.title}</p>
                      <p className="text-xs font-semibold text-forest-700">{tip.votesThisMonth} gillningar</p>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">{categoryLabel(tip.category)}{tip.createdBy ? ` • av ${tip.createdBy}` : ""}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-stone-500">Inga röster ännu denna månad.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center gap-2 text-forest-800 font-semibold">
              <BarChart3 className="w-4 h-4" />
              Mest aktiva contributors ({monthLabel})
            </CardHeader>
            <CardBody className="space-y-3">
              {leaderboard?.topContributors.length ? (
                leaderboard.topContributors.map((person, idx) => (
                  <div key={person.id} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-stone-800">#{idx + 1} {person.name}</p>
                      <p className="text-xs font-semibold text-forest-700">{person.total} bidrag</p>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">Tips: {person.tips} • Bilder: {person.photos} • Gästbok: {person.guestbook}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-stone-500">Ingen aktivitet ännu denna månad.</p>
              )}
            </CardBody>
          </Card>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex items-center gap-2 text-forest-800 font-semibold">
              <MessageCircle className="w-4 h-4" />
              Fråga admin och familjen
            </CardHeader>
            <CardBody>
              {session ? (
                <form onSubmit={submitSupportMessage} className="space-y-3">
                  <Textarea
                    value={supportDraft}
                    onChange={(e) => setSupportDraft(e.target.value)}
                    placeholder="Skriv en fråga, idé eller snabb uppdatering..."
                    maxLength={1000}
                    rows={3}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-stone-400">{supportDraft.length}/1000</p>
                    <Button type="submit" variant="sand" size="sm" disabled={supportSending || !supportDraft.trim()}>
                      <Send className="w-4 h-4" />
                      {supportSending ? "Skickar..." : "Skicka"}
                    </Button>
                  </div>
                  {supportError && <p className="text-sm text-red-600">{supportError}</p>}
                </form>
              ) : (
                <p className="text-sm text-stone-600">
                  <Link href="/logga-in" className="text-forest-700 font-medium hover:underline">Logga in</Link> för att skriva i tråden.
                </p>
              )}

              <div className="mt-5 max-h-80 overflow-auto space-y-3 pr-1">
                {messages.length === 0 ? (
                  <p className="text-sm text-stone-500">Inga meddelanden ännu.</p>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
                      <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
                        <span>
                          {message.author?.name ?? "Anonym"}
                          {message.author?.role === "ADMIN" ? " (Admin)" : ""}
                        </span>
                        <div className="flex items-center gap-2">
                          <span>{formatDateShort(message.createdAt)}</span>
                          {role === "ADMIN" && (
                            <button
                              type="button"
                              className="text-stone-400 hover:text-red-600 disabled:opacity-50"
                              onClick={() => deleteSupportMessage(message.id)}
                              disabled={deletingMessageId === message.id}
                              title="Ta bort meddelande"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-stone-700 mt-1 whitespace-pre-wrap">{message.content}</p>
                    </div>
                  ))
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-forest-800 font-semibold">
                <BarChart3 className="w-4 h-4" /> Omröstningar
              </p>
              {role === "ADMIN" && <span className="text-xs text-forest-700">Admin kan skapa nya</span>}
            </CardHeader>
            <CardBody className="space-y-4">
              {role === "ADMIN" && (
                <form onSubmit={createPoll} className="rounded-xl border border-stone-200 p-3 space-y-2 bg-stone-50">
                  <Input
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="Fråga, t.ex. Ska vi köpa ny kaffemaskin?"
                  />
                  <Input
                    value={pollDescription}
                    onChange={(e) => setPollDescription(e.target.value)}
                    placeholder="Valfri beskrivning"
                  />
                  {pollOptions.map((option, index) => (
                    <Input
                      key={index}
                      value={option}
                      onChange={(e) => updatePollOption(index, e.target.value)}
                      placeholder={`Alternativ ${index + 1}`}
                    />
                  ))}
                  {pollOptions.length < 8 && (
                    <button
                      type="button"
                      className="text-xs text-forest-700 hover:underline"
                      onClick={() => setPollOptions((prev) => [...prev, ""])}
                    >
                      + Lägg till alternativ
                    </button>
                  )}
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" variant="sand" disabled={pollSubmitting}>
                      {pollSubmitting ? "Skapar..." : "Skapa omröstning"}
                    </Button>
                  </div>
                  {pollError && <p className="text-sm text-red-600">{pollError}</p>}
                </form>
              )}

              <div className="space-y-3 max-h-[28rem] overflow-auto pr-1">
                {polls.length === 0 ? (
                  <p className="text-sm text-stone-500">Inga omröstningar ännu.</p>
                ) : (
                  polls.map((poll) => {
                    const closed = poll.status === "CLOSED";
                    return (
                      <div key={poll.id} className="rounded-xl border border-stone-200 p-3">
                        <p className="text-sm font-semibold text-stone-800">{poll.question}</p>
                        {poll.description && <p className="text-xs text-stone-500 mt-1">{poll.description}</p>}
                        <p className="text-xs text-stone-400 mt-1">{poll.totalVotes} röster • skapad {formatDateShort(poll.createdAt)}{poll.createdBy ? ` av ${poll.createdBy}` : ""}</p>
                        {role === "ADMIN" && (
                          <div className="mt-2">
                            <button
                              type="button"
                              className="text-xs text-forest-700 hover:underline disabled:opacity-50"
                              onClick={() => setPollStatus(poll.id, poll.status === "ACTIVE" ? "CLOSED" : "ACTIVE")}
                              disabled={statusUpdatingPollId === poll.id}
                            >
                              {poll.status === "ACTIVE" ? "Stäng omröstning" : "Öppna omröstning"}
                            </button>
                          </div>
                        )}
                        <div className="mt-3 space-y-2">
                          {poll.options.map((option) => {
                            const percentage = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
                            const isMine = poll.myVoteOptionId === option.id;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                disabled={!session || closed || votingPollId === poll.id}
                                className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                                  isMine
                                    ? "border-forest-300 bg-forest-50"
                                    : "border-stone-200 hover:border-stone-300"
                                } ${!session || closed ? "opacity-70 cursor-not-allowed" : ""}`}
                                onClick={() => vote(poll.id, option.id)}
                              >
                                <div className="flex items-center justify-between gap-3 text-sm">
                                  <span>{option.text}</span>
                                  <span className="text-xs text-stone-500">{option.votes} ({percentage}%)</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        {closed && <p className="text-xs text-stone-500 mt-2">Omröstningen är stängd.</p>}
                      </div>
                    );
                  })
                )}
              </div>
            </CardBody>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader className="flex items-center gap-2 text-forest-800 font-semibold">
              <Trophy className="w-4 h-4" />
              Poll-arkiv och vinnare per månad
            </CardHeader>
            <CardBody className="space-y-4">
              {pollArchive.length === 0 ? (
                <p className="text-sm text-stone-500">Inga avslutade omröstningar ännu.</p>
              ) : (
                pollArchive.map((month) => (
                  <div key={month.monthKey} className="rounded-xl border border-stone-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <p className="text-sm font-semibold text-stone-800">{month.monthLabel}</p>
                      <p className="text-xs text-stone-500">{month.polls} polls • {month.totalVotes} röster</p>
                    </div>
                    <div className="space-y-2">
                      {month.winners.map((winner) => (
                        <div key={winner.pollId} className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2">
                          <p className="text-sm text-stone-800">{winner.question}</p>
                          <p className="text-xs text-stone-600 mt-1">
                            Vinnare: <span className="font-semibold">{winner.winnerLabel}</span> ({winner.winnerVotes}/{winner.totalVotes} röster)
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </section>
      </div>
    </div>
  );
}
