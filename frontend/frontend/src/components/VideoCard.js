"use client";

import { motion } from "framer-motion";
import "./VideoCard.css";

export default function VideoCard({ image, title }) {
  return (
    <motion.div
      className="video-card"
      whileHover={{ scale: 1.05 }}
    >
      <img src={image} alt={title} />

      <div className="card-overlay"></div>

      <h3>{title}</h3>
    </motion.div>
  );
}