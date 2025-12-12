import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trash2, Globe, Clock, User as UserIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout";
import type { ArticleWithUsername } from "@shared/schema";

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: articles = [], isLoading } = useQuery<ArticleWithUsername[]>({
    queryKey: ["articles"],
    queryFn: api.articles.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: api.articles.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast({
        title: "Article deleted",
        description: "The post has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete article.",
      });
    },
  });

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    deleteMutation.mutate(id);
  };

  const canDelete = (article: ArticleWithUsername) => {
    if (!user) return false;
    return user.role === "admin" || user.id === article.userId;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 w-full bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-baseline justify-between border-b pb-4">
          <h1 className="text-3xl font-serif font-bold text-foreground">Top Stories</h1>
          <span className="text-muted-foreground text-sm">{articles.length} posts</span>
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 rounded-lg border border-dashed">
            <h3 className="text-xl font-medium text-foreground mb-2">No articles yet</h3>
            <p className="text-muted-foreground mb-4">Be the first to share something interesting!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {articles.map((article) => (
              <Card key={article.id} className="group hover:shadow-md transition-shadow duration-300 border-border/60">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <span className="flex items-center gap-1 font-medium text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full">
                          <UserIcon className="h-3 w-3" />
                          {article.username}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      
                      <a 
                        href={article.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block group-hover:text-primary transition-colors"
                        data-testid={`link-article-${article.id}`}
                      >
                        <h2 className="text-xl font-serif font-bold leading-tight mb-2">
                          {article.title}
                        </h2>
                      </a>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Globe className="h-3 w-3" />
                        <span className="truncate max-w-[300px]">{new URL(article.url).hostname}</span>
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>

                    {canDelete(article) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mt-2 -mr-2"
                        onClick={() => handleDelete(article.id)}
                        data-testid={`button-delete-${article.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
