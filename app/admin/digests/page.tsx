import { createAdminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { SummarizedArticle } from "@/lib/types";

export default async function DigestsPage() {
  const supabase = createAdminClient();

  const { data: digests } = await supabase
    .from("daily_digests")
    .select("*")
    .order("digest_date", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Digests</h1>
        <p className="text-muted-foreground">
          Archive of all generated daily digests
        </p>
      </div>

      {(!digests || digests.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No digests generated yet
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {digests?.map((digest) => {
          const articles = (digest.articles ?? []) as SummarizedArticle[];
          const categories = (digest.categories_covered ?? []) as string[];

          return (
            <Card key={digest.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {new Date(digest.digest_date + "T00:00:00").toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{articles.length} articles</span>
                    <span>|</span>
                    <span>{categories.length} categories</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {digest.tldr && (
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      TL;DR
                    </p>
                    <p className="text-sm leading-relaxed">{digest.tldr}</p>
                  </div>
                )}

                {categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat) => (
                      <Badge key={cat} variant="outline" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                )}

                {articles.length > 0 && (
                  <>
                    <Separator />
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                        View articles ({articles.length})
                      </summary>
                      <div className="mt-3 space-y-3">
                        {articles.map((article, i) => (
                          <div
                            key={article.url || i}
                            className="rounded-md border p-3 space-y-1.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <a
                                  href={article.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium hover:underline"
                                >
                                  {article.title}
                                </a>
                                <p className="text-xs text-muted-foreground">
                                  {article.source}
                                  {article.score != null &&
                                    ` | Score: ${article.score.toFixed(1)}`}
                                </p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                {article.categories?.map((cat) => (
                                  <Badge
                                    key={cat}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {cat}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            {article.summary && (
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {article.summary}
                              </p>
                            )}
                            {article.whyItMatters && (
                              <p className="text-xs italic text-muted-foreground">
                                Why it matters: {article.whyItMatters}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
