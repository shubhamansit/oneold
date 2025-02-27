"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Image from "next/image";
import jwt from "jsonwebtoken";

const formSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const LoginPage = () => {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const { email, password } = values;

    // Specific hard-coded credentials for login
    if (
      (email.toLowerCase() === "bhavnagar@gmail.com" &&
        password === "Bhadresh@1234") ||
      (email.toLowerCase() === "bmcswippr@gmail.com" && password == "Ans@1234")
    ) {
      // Set authentication token in cookies
      // The 'expires' option sets the cookie to expire in 1 day
      const token = jwt.sign({ email: email.toLowerCase() }, "SUPERSECRET");

      Cookies.set("isAuthenticated", token, {
        expires: 1,
        path: "/",
        secure: process.env.NODE_ENV === "production",
      });

      // Success notification
      toast.success("Login Successful");

      // Redirect after successful login
      if (email.toLowerCase() === "bhavnagar@gmail.com") {
        router.push("/jobsummary");
      } else {
        router.push("/worksummary");
      }
    } else {
      // Error notification for incorrect credentials
      toast.error("Invalid email or password");
    }
  }

  return (
    <div className="w-full h-screen flex flex-col justify-center items-center">
      <Image
        src="/image.png"
        width={160}
        height={160}
        alt="logo"
        className="rounded-full mb-5"
      />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Password"
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
