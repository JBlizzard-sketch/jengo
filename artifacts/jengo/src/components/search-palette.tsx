import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  useListBuildings, useListResidents, useListIssues, useListContractors,
  getListBuildingsQueryKey, getListResidentsQueryKey, getListIssuesQueryKey, getListContractorsQueryKey,
} from "@workspace/api-client-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Building, Users, AlertCircle, Search, Wrench } from "lucide-react";

interface SearchResult {
  id: string;
  label: string;
  sublabel: string;
  href: string;
  type: "building" | "resident" | "issue" | "contractor";
}

function ResultIcon({ type }: { type: SearchResult["type"] }) {
  const cls = "w-4 h-4 flex-shrink-0";
  if (type === "building") return <Building className={`${cls} text-primary`} />;
  if (type === "resident") return <Users className={`${cls} text-blue-500`} />;
  if (type === "contractor") return <Wrench className={`${cls} text-purple-500`} />;
  return <AlertCircle className={`${cls} text-amber-500`} />;
}

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: buildings } = useListBuildings({ query: { queryKey: getListBuildingsQueryKey(), enabled: open } });
  const { data: residents } = useListResidents(undefined, { query: { queryKey: getListResidentsQueryKey(), enabled: open } });
  const { data: issues } = useListIssues(undefined, { query: { queryKey: getListIssuesQueryKey(), enabled: open } });
  const { data: contractors } = useListContractors({ query: { queryKey: getListContractorsQueryKey(), enabled: open } });

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const q = query.toLowerCase().trim();

  const results: SearchResult[] = [];

  if (q.length >= 1) {
    (buildings ?? [])
      .filter(b => b.name.toLowerCase().includes(q) || b.neighbourhood.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach(b => results.push({
        id: `building-${b.id}`,
        label: b.name,
        sublabel: `Building · ${b.neighbourhood.replace("_", " ")}`,
        href: `/buildings/${b.id}`,
        type: "building",
      }));

    (residents ?? [])
      .filter(r =>
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .forEach(r => results.push({
        id: `resident-${r.id}`,
        label: `${r.firstName} ${r.lastName}`,
        sublabel: `Resident · ${r.phone ?? r.email ?? ""}`,
        href: `/residents/${r.id}`,
        type: "resident",
      }));

    (contractors ?? [])
      .filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.trade?.toLowerCase().includes(q)
      )
      .slice(0, 3)
      .forEach(c => results.push({
        id: `contractor-${c.id}`,
        label: c.name,
        sublabel: `Contractor · ${c.trade}${c.company ? ` · ${c.company}` : ""}`,
        href: `/contractors`,
        type: "contractor",
      }));

    (issues ?? [])
      .filter(i => i.title.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach(i => results.push({
        id: `issue-${i.id}`,
        label: i.title,
        sublabel: `Issue · ${i.status.replace("_", " ")} · ${i.category ?? ""}`,
        href: `/issues/${i.id}`,
        type: "issue",
      }));
  }

  const navigate = (result: SearchResult) => {
    setLocation(result.href);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      navigate(results[activeIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden" aria-describedby={undefined}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search buildings, residents, issues..."
            className="border-0 shadow-none p-0 h-auto text-base focus-visible:ring-0 bg-transparent"
          />
        </div>

        {q.length < 1 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Type to search across buildings, residents and issues
          </div>
        ) : results.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No results for "<span className="font-medium text-foreground">{query}</span>"
          </div>
        ) : (
          <ul className="py-2 max-h-80 overflow-y-auto">
            {results.map((result, index) => (
              <li key={result.id}>
                <button
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    index === activeIndex ? "bg-primary/10" : "hover:bg-muted/60"
                  }`}
                  onClick={() => navigate(result)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <ResultIcon type={result.type} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{result.label}</p>
                    <p className="text-xs text-muted-foreground capitalize truncate">{result.sublabel}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-border px-4 py-2 flex gap-4 text-[11px] text-muted-foreground">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
