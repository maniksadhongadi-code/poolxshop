"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

type PasswordProtectionProps = {
  onAuthenticated: () => void;
};

const PASSWORD_KEY = "is-authenticated";
const CORRECT_PASSWORD = "poolXshop";

export function PasswordProtection({ onAuthenticated }: PasswordProtectionProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // This effect runs only on the client
    const isAuthenticated = localStorage.getItem(PASSWORD_KEY) === "true";
    if (isAuthenticated) {
      onAuthenticated();
    }
  }, [onAuthenticated]);
  
  const handleLogin = () => {
    if (password === CORRECT_PASSWORD) {
      localStorage.setItem(PASSWORD_KEY, "true");
      onAuthenticated();
    } else {
      setError("Incorrect password. Please try again.");
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleLogin();
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
             <ShieldCheck className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Authentication Required</CardTitle>
          <CardDescription>Please enter the password to access the Customer Hub.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
            onKeyPress={handleKeyPress}
            className="text-center"
          />
          {error && <p className="text-sm text-center text-destructive">{error}</p>}
        </CardContent>
        <CardFooter>
          <Button onClick={handleLogin} className="w-full">
            Unlock
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}