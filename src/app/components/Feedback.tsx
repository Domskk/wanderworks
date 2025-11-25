"use client";

import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useState } from "react";

interface Props {
  messageId: string;
  messageText: string;
}

export default function FeedbackButtons({ messageId, messageText }: Props) {
  const [voted, setVoted] = useState<boolean>(false);
  const [rating, setRating] = useState<1 | -1 | null>(null);

  const sendFeedback = async (value: 1 | -1) => {
    if (voted) return;
    setVoted(true);
    setRating(value);

    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message_id: messageId,
        rating: value,
        text: messageText,
        user_id: "guest", // Replace with real user ID later
      }),
    });
  };

  return (
    <div className="flex gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={() => sendFeedback(1)}
        disabled={voted}
        className={`p-2 rounded-full transition-all ${
          rating === 1 ? "bg-green-500 text-white" : "bg-gray-200 hover:bg-gray-300"
        }`}
        title="This translation was accurate"
      >
        <ThumbsUp size={16} />
      </button>
      <button
        onClick={() => sendFeedback(-1)}
        disabled={voted}
        className={`p-2 rounded-full transition-all ${
          rating === -1 ? "bg-red-500 text-white" : "bg-gray-200 hover:bg-gray-300"
        }`}
        title="This translation was wrong"
      >
        <ThumbsDown size={16} />
      </button>
    </div>
  );
}