import { describe, expect, it } from "vitest";
import {
  normalizeImportedCategoryName,
  normalizeImportedCategorySlug,
  processPostRecord,
  resolveCategory,
} from "./functions/bulk-import";

interface MockCategoryRow {
  id: string;
  name: string | null;
  slug: string | null;
}

interface MockPostRow {
  id: string;
  title: unknown;
  slug: unknown;
  category_id: string | null;
  [key: string]: unknown;
}

interface MockImportJobItemRow {
  import_job_id: string;
  row_index: number;
  source_data: Record<string, unknown>;
  target_slug: string | null;
  status: string;
  error_message: string | null;
  created_entity_id: string | null;
}

interface MockDatabase {
  post_categories: MockCategoryRow[];
  posts: MockPostRow[];
  import_job_items: MockImportJobItemRow[];
}

interface MockSupabaseOptions {
  beforeInsertCategory?: (row: { name: string; slug: string }, db: MockDatabase) => void;
}

type QueryAction = "select" | "insert" | "update";
type QueryFilter =
  | { type: "eq"; field: string; value: unknown }
  | { type: "ilike"; field: string; value: string };

class MockQueryBuilder {
  private action: QueryAction = "select";
  private filters: QueryFilter[] = [];
  private limitCount: number | null = null;
  private payload: Record<string, unknown> | null = null;
  private singleMode: "many" | "single" | "maybeSingle" = "many";
  private selectedColumns: string[] | null = null;

  constructor(
    private readonly db: MockDatabase,
    private readonly table: keyof MockDatabase,
    private readonly options: MockSupabaseOptions,
  ) {}

  select(columns: string): this {
    this.selectedColumns = columns
      .split(",")
      .map((column) => column.trim())
      .filter(Boolean);
    return this;
  }

  eq(field: string, value: unknown): this {
    this.filters.push({ type: "eq", field, value });
    return this;
  }

  ilike(field: string, value: string): this {
    this.filters.push({ type: "ilike", field, value });
    return this;
  }

  limit(value: number): this {
    this.limitCount = value;
    return this;
  }

  insert(payload: Record<string, unknown>): this {
    this.action = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: Record<string, unknown>): this {
    this.action = "update";
    this.payload = payload;
    return this;
  }

  single(): this {
    this.singleMode = "single";
    return this;
  }

  maybeSingle(): this {
    this.singleMode = "maybeSingle";
    return this;
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: { code?: string; message?: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private execute(): { data: unknown; error: { code?: string; message?: string } | null } {
    if (this.action === "insert") {
      return this.executeInsert();
    }

    if (this.action === "update") {
      return this.executeUpdate();
    }

    return this.executeSelect();
  }

  private executeSelect(): { data: unknown; error: null } {
    let rows = [...this.db[this.table]] as Record<string, unknown>[];

    for (const filter of this.filters) {
      if (filter.type === "eq") {
        rows = rows.filter((row) => row[filter.field] === filter.value);
        continue;
      }

      rows = rows.filter((row) => {
        const currentValue = row[filter.field];
        return typeof currentValue === "string"
          ? currentValue.toLowerCase() === filter.value.toLowerCase()
          : false;
      });
    }

    if (this.limitCount != null) {
      rows = rows.slice(0, this.limitCount);
    }

    const selectedRows = rows.map((row) => this.pickColumns(row));

    if (this.singleMode === "single" || this.singleMode === "maybeSingle") {
      return { data: selectedRows[0] ?? null, error: null };
    }

    return { data: selectedRows, error: null };
  }

  private executeInsert(): { data: unknown; error: { code?: string; message?: string } | null } {
    if (!this.payload) {
      return { data: null, error: { message: "Missing insert payload" } };
    }

    if (this.table === "post_categories") {
      const row = this.payload as { name: string; slug: string };
      this.options.beforeInsertCategory?.(row, this.db);

      const duplicate = this.db.post_categories.find((category) => category.slug === row.slug);
      if (duplicate) {
        return {
          data: null,
          error: {
            code: "23505",
            message: 'duplicate key value violates unique constraint "post_categories_slug_key"',
          },
        };
      }

      const insertedRow: MockCategoryRow = {
        id: makeUuid(this.db.post_categories.length + 1),
        name: row.name,
        slug: row.slug,
      };
      this.db.post_categories.push(insertedRow);
      return { data: this.finalizeInsertedRows([insertedRow]), error: null };
    }

    if (this.table === "posts") {
      const insertedRow: MockPostRow = {
        id: makeUuid(this.db.posts.length + 101),
        category_id: (this.payload.category_id as string | null | undefined) ?? null,
        ...this.payload,
      };
      this.db.posts.push(insertedRow);
      return { data: this.finalizeInsertedRows([insertedRow]), error: null };
    }

    if (this.table === "import_job_items") {
      const insertedRow = this.payload as MockImportJobItemRow;
      this.db.import_job_items.push(insertedRow);
      return { data: this.finalizeInsertedRows([insertedRow]), error: null };
    }

    return { data: null, error: { message: `Unsupported insert table: ${this.table}` } };
  }

  private executeUpdate(): { data: unknown; error: { message?: string } | null } {
    if (!this.payload) {
      return { data: null, error: { message: "Missing update payload" } };
    }

    if (this.table !== "posts") {
      return { data: null, error: { message: `Unsupported update table: ${this.table}` } };
    }

    const slugFilter = this.filters.find((filter) => filter.type === "eq" && filter.field === "id");
    const existingRow = this.db.posts.find((post) => post.id === slugFilter?.value);
    if (!existingRow) {
      return { data: null, error: { message: "Row not found" } };
    }

    Object.assign(existingRow, this.payload);
    return { data: null, error: null };
  }

  private finalizeInsertedRows(rows: Record<string, unknown>[]): unknown {
    const selectedRows = rows.map((row) => this.pickColumns(row));
    if (this.singleMode === "single" || this.singleMode === "maybeSingle") {
      return selectedRows[0] ?? null;
    }
    return selectedRows;
  }

  private pickColumns(row: Record<string, unknown>): Record<string, unknown> {
    if (!this.selectedColumns || this.selectedColumns.length === 0 || this.selectedColumns.includes("*")) {
      return { ...row };
    }

    return this.selectedColumns.reduce<Record<string, unknown>>((result, column) => {
      result[column] = row[column];
      return result;
    }, {});
  }
}

function createMockSupabase(
  initialDb?: Partial<MockDatabase>,
  options: MockSupabaseOptions = {},
): { db: MockDatabase; client: { from: (table: keyof MockDatabase) => MockQueryBuilder } } {
  const db: MockDatabase = {
    post_categories: initialDb?.post_categories ? [...initialDb.post_categories] : [],
    posts: initialDb?.posts ? [...initialDb.posts] : [],
    import_job_items: initialDb?.import_job_items ? [...initialDb.import_job_items] : [],
  };

  return {
    db,
    client: {
      from(table: keyof MockDatabase) {
        return new MockQueryBuilder(db, table, options);
      },
    },
  };
}

function makeUuid(seed: number): string {
  return `00000000-0000-0000-0000-${String(seed).padStart(12, "0")}`;
}

describe("bulk import category helpers", () => {
  it("normalizes category names and slugs consistently", () => {
    expect(normalizeImportedCategoryName("  Personal   Injury  ")).toBe("Personal Injury");
    expect(normalizeImportedCategorySlug("  Personal   Injury  ")).toBe("personal-injury");
  });

  it("returns null for empty category input", async () => {
    const { client } = createMockSupabase();

    await expect(resolveCategory("   ", client as never)).resolves.toBeNull();
  });

  it("reuses an existing category by normalized slug", async () => {
    const existingId = makeUuid(1);
    const { db, client } = createMockSupabase({
      post_categories: [{ id: existingId, name: "Personal Injury", slug: "personal-injury" }],
    });

    const categoryId = await resolveCategory(" Personal   Injury ", client as never);

    expect(categoryId).toBe(existingId);
    expect(db.post_categories).toHaveLength(1);
  });

  it("reuses an obvious name-equivalent category even when the stored slug differs", async () => {
    const existingId = makeUuid(2);
    const { db, client } = createMockSupabase({
      post_categories: [{ id: existingId, name: "Mass   Torts", slug: "legacy-mass-torts" }],
    });

    const categoryId = await resolveCategory("mass torts", client as never);

    expect(categoryId).toBe(existingId);
    expect(db.post_categories).toHaveLength(1);
  });

  it("creates a missing category once and reuses it on repeated imports", async () => {
    const { db, client } = createMockSupabase();

    const firstId = await resolveCategory("Catastrophic Injuries", client as never);
    const secondId = await resolveCategory("  catastrophic   injuries  ", client as never);

    expect(firstId).toBeTruthy();
    expect(secondId).toBe(firstId);
    expect(db.post_categories).toHaveLength(1);
    expect(db.post_categories[0]).toMatchObject({
      name: "Catastrophic Injuries",
      slug: "catastrophic-injuries",
    });
  });

  it("re-queries by slug after a unique-slug insert collision", async () => {
    const collidedId = makeUuid(9);
    const { db, client } = createMockSupabase(
      undefined,
      {
        beforeInsertCategory(row, database) {
          if (!database.post_categories.some((category) => category.slug === row.slug)) {
            database.post_categories.push({
              id: collidedId,
              name: "Wrongful Death",
              slug: row.slug,
            });
          }
        },
      },
    );

    const categoryId = await resolveCategory("Wrongful Death", client as never);

    expect(categoryId).toBe(collidedId);
    expect(db.post_categories).toHaveLength(1);
  });
});

describe("processPostRecord", () => {
  it("persists the resolved category_id without storing the raw category field", async () => {
    const { db, client } = createMockSupabase();

    const result = await processPostRecord(
      {
        title: "What to Do After a Car Accident",
        slug: "after-a-car-accident",
        body: "<p>Helpful guidance</p>",
        category: "Car Accidents",
      },
      "create",
      client as never,
      0,
      "job-1",
    );

    expect(result.status).toBe("created");
    expect(db.post_categories).toHaveLength(1);
    expect(db.posts).toHaveLength(1);
    expect(db.posts[0].category_id).toBe(db.post_categories[0].id);
    expect(db.posts[0]).not.toHaveProperty("category");
  });
});
