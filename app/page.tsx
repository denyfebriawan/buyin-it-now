import { ProductCard } from "@/components/product-card";
import { getProducts } from "@/lib/products";

export default async function Home() {
  const products = await getProducts();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">All products</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {products.length} items
      </p>

      {products.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">
          No products are available yet. Please check back soon.
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
