import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateIssue, useListBuildings, getListIssuesQueryKey, getListBuildingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

const schema = z.object({
  buildingId: z.coerce.number().min(1, "Select a building"),
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().optional(),
  category: z.enum(["noise", "maintenance", "parking", "visitor", "utility", "security", "other"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  evidenceUrl: z.string().url().optional().or(z.literal("")),
  evidenceType: z.enum(["photo", "audio", "video", "document"]).optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewIssue() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const createIssue = useCreateIssue();
  const { data: buildings } = useListBuildings({ query: { queryKey: getListBuildingsQueryKey() } });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", category: "maintenance", priority: "medium", buildingId: 0, evidenceUrl: "" },
  });

  const onSubmit = (data: FormData) => {
    createIssue.mutate(
      { data: { ...data, buildingId: data.buildingId, evidenceUrl: data.evidenceUrl || undefined } as any },
      {
        onSuccess: (issue) => {
          qc.invalidateQueries({ queryKey: getListIssuesQueryKey() });
          setLocation(`/issues/${issue.id}`);
        }
      }
    );
  };

  return (
    <div className="max-w-2xl space-y-6">
      <button onClick={() => setLocation("/issues")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm" data-testid="button-back">
        <ArrowLeft className="w-4 h-4" />
        Back to Issues
      </button>

      <Card>
        <CardHeader>
          <CardTitle>Submit New Issue</CardTitle>
        </CardHeader>
        <CardContent>
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
                  <FormLabel>Issue Title</FormLabel>
                  <FormControl><Input placeholder="Brief description of the issue" {...field} data-testid="input-title" /></FormControl>
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
                        {["noise", "maintenance", "parking", "visitor", "utility", "security", "other"].map(c => (
                          <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-priority"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {["low", "medium", "high", "urgent"].map(p => (
                          <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea placeholder="Detailed description of the issue..." rows={4} {...field} data-testid="input-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="evidenceUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Evidence URL (optional)</FormLabel>
                  <FormControl><Input placeholder="https://... photo or audio link" {...field} data-testid="input-evidence-url" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {form.watch("evidenceUrl") && (
                <FormField control={form.control} name="evidenceType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evidence Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-evidence-type"><SelectValue placeholder="Select type" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {["photo", "audio", "video", "document"].map(t => (
                          <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              )}

              <Button type="submit" disabled={createIssue.isPending} className="w-full" data-testid="button-submit">
                {createIssue.isPending ? "Submitting..." : "Submit Issue"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
