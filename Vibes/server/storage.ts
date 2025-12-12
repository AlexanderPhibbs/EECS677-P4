import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc } from "drizzle-orm";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";
import type { User, InsertUser, Article, InsertArticle, ArticleWithUsername } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getArticles(): Promise<ArticleWithUsername[]>;
  getArticleById(id: number): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  deleteArticle(id: number): Promise<void>;
}

export class PostgresStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    this.db = drizzle(pool, { schema });
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(schema.users).where(eq(schema.users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(schema.users).where(eq(schema.users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(schema.users).values(insertUser).returning();
    return result[0];
  }

  async getArticles(): Promise<ArticleWithUsername[]> {
    const result = await this.db
      .select({
        id: schema.articles.id,
        title: schema.articles.title,
        url: schema.articles.url,
        userId: schema.articles.userId,
        createdAt: schema.articles.createdAt,
        username: schema.users.username,
      })
      .from(schema.articles)
      .leftJoin(schema.users, eq(schema.articles.userId, schema.users.id))
      .orderBy(desc(schema.articles.createdAt));
    
    return result.map(row => ({
      id: row.id,
      title: row.title,
      url: row.url,
      userId: row.userId,
      createdAt: row.createdAt,
      username: row.username || "Unknown",
    }));
  }

  async getArticleById(id: number): Promise<Article | undefined> {
    const result = await this.db.select().from(schema.articles).where(eq(schema.articles.id, id));
    return result[0];
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const result = await this.db.insert(schema.articles).values(insertArticle).returning();
    return result[0];
  }

  async deleteArticle(id: number): Promise<void> {
    await this.db.delete(schema.articles).where(eq(schema.articles.id, id));
  }
}

export const storage = new PostgresStorage();
