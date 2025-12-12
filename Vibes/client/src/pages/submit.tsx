import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Layout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const submitSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  url: z.string().url("Please enter a valid URL"),
});

export default function Submit() {
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof submitSchema>>({
    resolver: zodResolver(submitSchema),
    defaultValues: {
      title: "",
      url: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: ({ title, url }: { title: string; url: string }) => 
      api.articles.create(title, url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast({
        title: "Success!",
        description: "Your link has been posted.",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to post article.",
      });
    },
  });

  if (!user) {
    setLocation("/login");
    return null;
  }

  function onSubmit(values: z.infer<typeof submitSchema>) {
    createMutation.mutate(values);
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-primary" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Feed
          </Link>
        </Button>
        
        <Card className="border-border/60 shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl font-serif">Submit a Link</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. The Future of Web Development" 
                          data-testid="input-title"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        A descriptive title for the article you are sharing.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://example.com/article" 
                          data-testid="input-url"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        The direct link to the content.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    size="lg"
                    disabled={createMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending ? "Posting..." : "Post to Board"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
