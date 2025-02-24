import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const products = [
  { id: 1, name: "Product 1", category: "Category A", price: "$19.99" },
  { id: 2, name: "Product 2", category: "Category B", price: "$29.99" },
  { id: 3, name: "Product 3", category: "Category A", price: "$39.99" },
  { id: 4, name: "Product 4", category: "Category C", price: "$49.99" },
  { id: 5, name: "Product 5", category: "Category B", price: "$59.99" },
  { id: 6, name: "Product 6", category: "Category C", price: "$69.99" },
];

const ProductGrid = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <Card key={product.id}>
          <CardHeader>
            <CardTitle>{product.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge>{product.category}</Badge>
          </CardContent>
          <CardFooter>
            <p className="font-bold">{product.price}</p>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default ProductGrid;
