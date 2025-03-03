"use client";

import type * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TimeFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: Date;
  onChange: (date: Date) => void;
  className?: string;
}

export function TimeField({
  value,
  onChange,
  className,
  ...props
}: TimeFieldProps) {
  const hours = value.getHours();
  const minutes = value.getMinutes();
  const seconds = value.getSeconds();

  const updateTime = (
    type: "hours" | "minutes" | "seconds",
    newValue: number,
  ) => {
    const newDate = new Date(value);

    if (type === "hours") {
      newDate.setHours(newValue);
    } else if (type === "minutes") {
      newDate.setMinutes(newValue);
    } else if (type === "seconds") {
      newDate.setSeconds(newValue);
    }

    onChange(newDate);
  };

  const incrementHours = () => {
    updateTime("hours", (hours + 1) % 24);
  };

  const decrementHours = () => {
    updateTime("hours", (hours - 1 + 24) % 24);
  };

  const incrementMinutes = () => {
    updateTime("minutes", (minutes + 1) % 60);
  };

  const decrementMinutes = () => {
    updateTime("minutes", (minutes - 1 + 60) % 60);
  };

  const incrementSeconds = () => {
    updateTime("seconds", (seconds + 1) % 60);
  };

  const decrementSeconds = () => {
    updateTime("seconds", (seconds - 1 + 60) % 60);
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseInt(e.target.value);
    if (!isNaN(val) && val >= 0 && val < 24) {
      updateTime("hours", val);
    }
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseInt(e.target.value);
    if (!isNaN(val) && val >= 0 && val < 60) {
      updateTime("minutes", val);
    }
  };

  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseInt(e.target.value);
    if (!isNaN(val) && val >= 0 && val < 60) {
      updateTime("seconds", val);
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex flex-col items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={incrementHours}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Input
          type="text"
          value={hours.toString().padStart(2, "0")}
          onChange={handleHoursChange}
          className="h-8 w-12 text-center"
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={decrementHours}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>
      <span className="text-lg">:</span>
      <div className="flex flex-col items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={incrementMinutes}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Input
          type="text"
          value={minutes.toString().padStart(2, "0")}
          onChange={handleMinutesChange}
          className="h-8 w-12 text-center"
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={decrementMinutes}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>
      <span className="text-lg">:</span>
      <div className="flex flex-col items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={incrementSeconds}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Input
          type="text"
          value={seconds.toString().padStart(2, "0")}
          onChange={handleSecondsChange}
          className="h-8 w-12 text-center"
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={decrementSeconds}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
