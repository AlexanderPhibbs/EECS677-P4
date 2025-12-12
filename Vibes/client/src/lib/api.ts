import type { User, Article, ArticleWithUsername } from "@shared/schema";

const API_BASE = "/api";

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || "Request failed");
  }

  return response.json();
}

export const api = {
  auth: {
    register: async (username: string, password: string) => {
      return fetchWithAuth(`${API_BASE}/auth/register`, {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
    },
    
    login: async (username: string, password: string) => {
      return fetchWithAuth(`${API_BASE}/auth/login`, {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
    },
    
    logout: async () => {
      return fetchWithAuth(`${API_BASE}/auth/logout`, {
        method: "POST",
      });
    },
    
    getUser: async (): Promise<{ user: User }> => {
      return fetchWithAuth(`${API_BASE}/auth/user`);
    },
  },

  articles: {
    getAll: async (): Promise<ArticleWithUsername[]> => {
      return fetchWithAuth(`${API_BASE}/articles`);
    },
    
    create: async (title: string, url: string): Promise<Article> => {
      return fetchWithAuth(`${API_BASE}/articles`, {
        method: "POST",
        body: JSON.stringify({ title, url }),
      });
    },
    
    delete: async (id: number): Promise<void> => {
      return fetchWithAuth(`${API_BASE}/articles/${id}`, {
        method: "DELETE",
      });
    },
  },
};
