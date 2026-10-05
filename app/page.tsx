"use client";

import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import { getLoginRedirectForEmail } from "@/lib/authUsers";

// Set to true to disable login and show "contact administrator" message
const LOGIN_DISABLED = false;

const formSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const LoginPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const { email, password } = values;
    setIsLoading(true);

    try {
      // Specific hard-coded credentials for login
      const normalizedEmail = email.toLowerCase();
      const isValidLogin =
        (normalizedEmail === "bhavnagar@gmail.com" &&
          password === "Bhadresh@1234") ||
        (normalizedEmail === "bmcswippr@gmail.com" &&
          password == "Ans@1234") ||
        (normalizedEmail === "osc@swm.com" && password === "98765432") ||
        (normalizedEmail === "nasikwaste123@gmail.com" &&
          password === "Nasik@1212") ||
        (normalizedEmail === "nmc123@gmail.com" && password === "Nmc1234@") ||
        (normalizedEmail === "hmc@gmail.com" &&
          password === "Corporation@hisar2025") ||
        (normalizedEmail === "mmcshreeji@gmail.com" &&
          password === "Ans@123");

      if (isValidLogin) {
        const token = jwt.sign({ email: normalizedEmail }, "SUPERSECRET");

        Cookies.set("isAuthenticated", token, {
          expires: 1,
          path: "/",
          secure: process.env.NODE_ENV === "production",
        });
        toast.success("Login Successful");
        router.push(getLoginRedirectForEmail(normalizedEmail));
        // Keep loader until navigation completes
      } else {
        toast.error("Invalid email or password");
        setIsLoading(false);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setIsLoading(false);
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
          {LOGIN_DISABLED ? (
            <p className="text-center text-muted-foreground">
              Please contact your administrator.
            </p>
          ) : (
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
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
