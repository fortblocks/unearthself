import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Chip } from "@/components/desk/Chip";
import { Section } from "@/components/desk/Section";
import { Stat } from "@/components/desk/Stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { CHANNELS, type PostStatus, type SocialChannel, type SocialPost } from "@/data/socials";
import { useDesk } from "@/lib/desk-store";

export const Route = createFileRoute("/admin/socials")({
  component: SocialsPage,
  head: () => ({ meta: [{ title: "Socials — Unearth Self Desk" }] }),
});

const STATUSES: Array<PostStatus | "all"> = ["all", "idea", "draft", "queued", "posted", "killed"];

const SUGGESTIONS: { channel: SocialChannel; title: string; body: string }[] = [
  {
    channel: "linkedin",
    title: "Spring first-wave",
    body: "Spring 2027 is open for first teams. Eight to twenty-four people, two or three days, Drumheller. unearthself.xyz/spring",
  },
  {
    channel: "x",
    title: "Four rooms",
    body: "Haven is four suites on the coulee. That is the house. Lisa handles overflow.",
  },
  {
    channel: "instagram",
    title: "Land first",
    body: "The programme happens on the land. The phone stays in a pocket until someone is asked to open it.",
  },
];

function SocialsPage() {
  const posts = useDesk((s) => s.posts);
  const setPostStatus = useDesk((s) => s.setPostStatus);
  const queueIdea = useDesk((s) => s.queueIdea);
  const logPostMetrics = useDesk((s) => s.logPostMetrics);
  const [channel, setChannel] = useState<SocialChannel | "all">("all");
  const [status, setStatus] = useState<PostStatus | "all">("all");

  const filtered = posts.filter((p) => {
    if (channel !== "all" && p.channel !== channel) return false;
    if (status !== "all" && p.status !== status) return false;
    return true;
  });

  const posted = posts.filter((p) => p.status === "posted");
  const impressions = posted.reduce((s, p) => s + p.impressions, 0);
  const likes = posted.reduce((s, p) => s + p.likes, 0);
  const chart = useMemo(
    () =>
      CHANNELS.map((c) => ({
        channel: c.label,
        impressions: posted.filter((p) => p.channel === c.id).reduce((s, p) => s + p.impressions, 0),
        likes: posted.filter((p) => p.channel === c.id).reduce((s, p) => s + p.likes, 0),
      })),
    [posted],
  );

  return (
    <div className="grid gap-10">
      <p className="max-w-prose text-pretty text-muted">
        Content lives on the book. Numbers below are logged by hand until a channel API is wired.
        Suggestions are for Christopher to edit. Tess signs anything that names PACE or the work.
      </p>

      <section className="grid gap-6 sm:grid-cols-3">
        <Stat label="Impressions" value={impressions.toLocaleString("en-CA")} hint="Posted, logged" />
        <Stat label="Likes" value={likes.toLocaleString("en-CA")} hint="Posted, logged" />
        <Stat
          label="In flight"
          value={String(posts.filter((p) => p.status === "draft" || p.status === "queued").length)}
          hint="Draft or queued"
        />
      </section>

      <section className="border border-line bg-paper p-5">
        <p className="mb-4 text-xs tracking-widest text-sandstone uppercase">By channel</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} barGap={6}>
              <XAxis
                dataKey="channel"
                tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "color-mix(in oklab, var(--color-coal) 4%, transparent)" }}
                contentStyle={{
                  border: "1px solid var(--color-line)",
                  background: "var(--color-paper)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="impressions" fill="var(--color-coal)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="likes" fill="var(--color-sandstone)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <Section kicker="Suggestions">
        <ul className="grid gap-3">
          {SUGGESTIONS.map((s) => (
            <li key={s.title} className="grid gap-3 border border-line bg-paper p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <Badge tone="hold">{s.channel}</Badge>
                <h2 className="mt-2 font-display text-3xl font-black uppercase leading-none">{s.title}</h2>
                <p className="mt-2 max-w-prose text-sm text-pretty">{s.body}</p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  queueIdea(s.channel, s.title, s.body);
                  toast(`Queued ${s.title}`);
                }}
              >
                File as idea
              </Button>
            </li>
          ))}
        </ul>
      </Section>

      <div className="flex flex-wrap gap-2">
        <Chip active={channel === "all"} onClick={() => setChannel("all")}>
          All channels
        </Chip>
        {CHANNELS.map((c) => (
          <Chip key={c.id} active={channel === c.id} onClick={() => setChannel(c.id)}>
            {c.label}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((st) => (
          <Chip key={st} active={status === st} onClick={() => setStatus(st)}>
            {st === "all" ? "All status" : st}
          </Chip>
        ))}
      </div>

      <NewPost
        onAdd={(input) => {
          queueIdea(input.channel, input.title, input.body);
          toast(`Filed ${input.title}`);
        }}
      />

      <ul className="grid gap-3">
        {filtered.map((p) => (
          <PostCard key={p.id} post={p} onStatus={setPostStatus} onMetrics={logPostMetrics} />
        ))}
      </ul>
    </div>
  );
}

function PostCard({
  post,
  onStatus,
  onMetrics,
}: {
  post: SocialPost;
  onStatus: (id: string, status: PostStatus) => void;
  onMetrics: (id: string, impressions: number, likes: number, replies: number) => void;
}) {
  function saveMetrics(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    onMetrics(
      post.id,
      Number(data.get("impressions") || 0),
      Number(data.get("likes") || 0),
      Number(data.get("replies") || 0),
    );
    toast(`Logged ${post.title}`);
  }

  return (
    <li className="grid gap-4 border border-line bg-paper p-4 md:grid-cols-[1fr_12rem]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="basecamp">{post.channel}</Badge>
          <Badge tone={post.status === "posted" ? "won" : post.status === "killed" ? "lost" : "hold"}>
            {post.status}
          </Badge>
        </div>
        <h2 className="mt-2 font-display text-3xl font-black uppercase leading-none">{post.title}</h2>
        <p className="mt-2 max-w-prose text-sm text-pretty">{post.body}</p>
        {post.note ? <p className="mt-2 text-sm text-muted">{post.note}</p> : null}
        {post.status === "posted" ? (
          <form onSubmit={saveMetrics} className="mt-4 flex flex-wrap items-end gap-2">
            <label>
              <Label>Impr.</Label>
              <Input name="impressions" type="number" min={0} defaultValue={post.impressions} className="w-24" />
            </label>
            <label>
              <Label>Likes</Label>
              <Input name="likes" type="number" min={0} defaultValue={post.likes} className="w-20" />
            </label>
            <label>
              <Label>Replies</Label>
              <Input name="replies" type="number" min={0} defaultValue={post.replies} className="w-20" />
            </label>
            <Button type="submit" variant="outline">
              Log
            </Button>
          </form>
        ) : null}
      </div>
      <NativeSelect
        value={post.status}
        onChange={(e) => onStatus(post.id, e.target.value as PostStatus)}
        aria-label={`Status for ${post.title}`}
      >
        {STATUSES.filter((s) => s !== "all").map((st) => (
          <option key={st} value={st}>
            {st}
          </option>
        ))}
      </NativeSelect>
    </li>
  );
}

function NewPost({
  onAdd,
}: {
  onAdd: (input: { channel: SocialChannel; title: string; body: string }) => void;
}) {
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    onAdd({
      channel: (data.get("channel") as SocialChannel) || "x",
      title: String(data.get("title") || "Untitled"),
      body: String(data.get("body") || ""),
    });
    e.currentTarget.reset();
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-4 border border-line bg-paper p-5 md:grid-cols-2">
      <label>
        <Label>Channel</Label>
        <NativeSelect name="channel">
          {CHANNELS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label>
        <Label>Title</Label>
        <Input name="title" required placeholder="Working title" />
      </label>
      <label className="md:col-span-2">
        <Label>Copy</Label>
        <textarea
          name="body"
          required
          rows={3}
          className="min-h-20 w-full resize-y rounded-sm border border-line bg-paper px-3 py-2 text-sm text-coal outline-none focus:border-coal"
        />
      </label>
      <div>
        <Button type="submit">File idea</Button>
      </div>
    </form>
  );
}
