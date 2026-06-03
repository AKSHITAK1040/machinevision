"use client";

import { motion } from "framer-motion";
import "./Hero.css";

export default function Hero() {
  return (
    <section className="hero">
      <div className="overlay"></div>

      <motion.div
        className="hero-content"
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        <h1>
          AI Powered
          <br />
          Streaming Experience
        </h1>

        <p>
          Detect products, search scenes, and interact with videos using AI.
        </p>

        <div className="hero-buttons">
          <button className="watch-btn">Watch Now</button>
          <button className="explore-btn">Explore AI</button>
        </div>
      </motion.div>
    </section>
  );
}