import { useState } from "react";
import {
  useListAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement,
  useListBuildings,
  getListAnnouncementsQueryKey, getListBuildingsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pin, Megaphone, Trash2, Search } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-gray-100 text-gray-600",
  maintenance: "bg-amber-100 text-amber-700",
  utility: "bg-blue-100 text-blue-700",
  emergency: "bg-red-100 text-red-700",
  event: "bg-purple-100 text-purple-700",
  agm: "bg-green-100 text-green-700",
};

const schema = z.object({
  buildingId: z.coerce.number().min(1, "Select a building"),
  title: z.string().min(3),
  content: z.string().min(10),
  category: z.enum(["general", "maintenance", "utility", "emergency", "event", "agm"]),
  isPinned: z.boolean().default(false),
  authorName: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function NewAnnouncementDialog({ buildingId }: { buildingId?: number }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const createAnnouncement = useCreateAnnouncement();
  const { data: buildings } = useListBuildings({ query: { queryKey: getListBuildingsQueryKey() } });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", content: "", category: "general", isPinned: false, authorName: "Management", buildingId: buildingId ?? 0 },
  });

  const onSubmit = (data: FormData) => {
    createAnnouncement.mutate(
      { data: data as any },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() });
          setOpen(false);
          form.reset();
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-new-announcement">
          <Plus className="w-4 h-4" />
          Post Announcement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Post Announcement</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="buildingId" render={({ field }) => (
              <FormItem>
                <FormLabel>Building</FormLabel>
                <Select onValueChange={v => field.onChange(Number(v))} value={field.value ? String(field.value) : ""}>
                  <FormControl>
                    <SelectTrigger data-testid="select-building"><SelectValue placeholder="Select building" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {buildings?.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl><Input {...field} data-testid="input-title" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="content" render={({ field }) => (
              <FormItem>
                <FormLabel>Content</FormLabel>
                <FormControl><Textarea rows={4} {...field} data-testid="input-content" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-category"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {["general", "maintenance", "utility", "emergency", "event", "agm"].map(c => (
                        <SelectItem key={c} value={c} className="capitalize">{c.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="authorName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Author</FormLabel>
                  <FormControl><Input placeholder="Management" {...field} data-testid="input-author" /></FormControl>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="isPinned" render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-pinned" />
                </FormControl>
                <FormLabel className="!mt-0">Pin to top</FormLabel>
              </FormItem>
            )} />
            <Button type="submit" disabled={createAnnouncement.isPending} className="w-full" data-testid="button-submit">
              {createAnnouncement.isPending ? "Posting..." : "Post Announcement"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Announcements() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { data: announcements, isLoading } = useListAnnouncements(
    undefined,
    { query: { queryKey: getListAnnouncementsQueryKey() } }
  );
  const updateAnnouncement = useUpdateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();

  const handlePin = (id: number, isPinned: boolean) => {
    updateAnnouncement.mutate(
      { id, data: { isPinned: !isPinned } },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() }) }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this announcement?")) return;
    deleteAnnouncement.mutate(
      { id },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() }) }
    );
  };

  const filtered = (announcements ?? []).filter(a => {
    if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !a.content.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const pinned = filtered.filter(a => a.isPinned);
  const unpinned = filtered.filter(a => !a.isPinned);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notice Board</h1>
          <p className="text-muted-foreground">Building announcements replacing the WhatsApp group</p>
        </div>
        <NewAnnouncementDialog />
      </div>

      {/* Search & filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search notices..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_COLORS).map(([k]) => (
              <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || categoryFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setCategoryFilter("all"); }}>Clear</Button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">{filtered.length} notice{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      ) : !announcements?.length ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No announcements yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Pin className="w-3 h-3" /> Pinned
              </p>
              {pinned.map(ann => <AnnouncementCard key={ann.id} ann={ann} onPin={handlePin} onDelete={handleDelete} />)}
            </div>
          )}
          {unpinned.length > 0 && (
            <div className="space-y-3">
              {pinned.length > 0 && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent</p>}
              {unpinned.map(ann => <AnnouncementCard key={ann.id} ann={ann} onPin={handlePin} onDelete={handleDelete} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AnnouncementCard({ ann, onPin, onDelete }: { ann: any; onPin: (id: number, pinned: boolean) => void; onDelete: (id: number) => void }) {
  return (
    <Card className={ann.isPinned ? "border-primary/30 bg-primary/5" : ""} data-testid={`card-announcement-${ann.id}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${CATEGORY_COLORS[ann.category] ?? "bg-gray-100 text-gray-600"}`}>
                {ann.category}
              </span>
              {ann.isPinned && (
                <span className="text-xs flex items-center gap-1 text-primary font-medium">
                  <Pin className="w-3 h-3" /> Pinned
                </span>
              )}
            </div>
            <h3 className="font-semibold text-foreground mb-1">{ann.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{ann.content}</p>
            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
              {ann.authorName && <span>{ann.authorName}</span>}
              <span>{new Date(ann.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost" size="icon"
              onClick={() => onPin(ann.id, ann.isPinned)}
              className={ann.isPinned ? "text-primary" : "text-muted-foreground"}
              data-testid={`button-pin-${ann.id}`}
            >
              <Pin className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost" size="icon"
              onClick={() => onDelete(ann.id)}
              className="text-muted-foreground hover:text-destructive"
              data-testid={`button-delete-${ann.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
