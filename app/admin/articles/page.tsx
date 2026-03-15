"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  SearchIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  XIcon,
} from "lucide-react";

interface ArticleRow {
  id: string;
  title: string;
  url: string;
  source: string;
  categories: string[] | null;
  score: number | null;
  published_at: string | null;
  summary: string | null;
  why_it_matters: string | null;
}

type SortDir = "asc" | "desc";

export default function ArticlesPage() {
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (dateFilter) params.set("date", dateFilter);
      params.set("sort", sortDir);
      const res = await fetch(`/api/admin/articles?${params}`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles);
      }
    } finally {
      setLoading(false);
    }
  }, [search, dateFilter, sortDir]);

  useEffect(() => {
    const timeout = setTimeout(fetchArticles, 300);
    return () => clearTimeout(timeout);
  }, [fetchArticles]);

  function toggleSort() {
    setSortDir((d) => (d === "desc" ? "asc" : "desc"));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Articles</h1>
        <p className="text-muted-foreground">
          Browse fetched and processed articles
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or source..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-40"
        />
        {(search || dateFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setDateFilter("");
            }}
          >
            <XIcon className="size-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>
                  <button
                    onClick={toggleSort}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Score
                    {sortDir === "desc" ? (
                      <ChevronDownIcon className="size-3" />
                    ) : (
                      <ChevronUpIcon className="size-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead>Published</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.map((article) => (
                <>
                  <TableRow
                    key={article.id}
                    className="cursor-pointer"
                    onClick={() =>
                      setExpandedId(
                        expandedId === article.id ? null : article.id
                      )
                    }
                  >
                    <TableCell className="font-medium max-w-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{article.title}</span>
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLinkIcon className="size-3" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {article.source}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(article.categories ?? []).map((cat) => (
                          <Badge key={cat} variant="outline" className="text-xs">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {article.score != null ? article.score.toFixed(1) : "--"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {article.published_at
                        ? new Date(article.published_at).toLocaleDateString()
                        : "--"}
                    </TableCell>
                  </TableRow>
                  {expandedId === article.id && (
                    <TableRow key={`${article.id}-expanded`}>
                      <TableCell colSpan={5} className="bg-muted/30 p-0">
                        <Card className="m-2 border-0 shadow-none bg-transparent">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Summary</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {article.summary || "No summary available"}
                            </p>
                            {article.why_it_matters && (
                              <>
                                <Separator />
                                <div>
                                  <p className="text-xs font-medium mb-1">
                                    Why it matters
                                  </p>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    {article.why_it_matters}
                                  </p>
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
              {articles.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No articles found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
