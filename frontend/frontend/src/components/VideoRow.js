import VideoCard from "./VideoCard";
import "./VideoRow.css";

const videos = [
  {
    title: "Luxury Fashion",
    image:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1974&auto=format&fit=crop",
  },
  {
    title: "Tech Review",
    image:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=2070&auto=format&fit=crop",
  },
  {
    title: "Travel Vlog",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=2070&auto=format&fit=crop",
  },
  {
    title: "Street Fashion",
    image:
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=1973&auto=format&fit=crop",
  },
];

export default function VideoRow({ title }) {
  return (
    <section className="video-row">
      <h2>{title}</h2>

      <div className="row-container">
        {videos.map((video, index) => (
          <VideoCard
            key={index}
            image={video.image}
            title={video.title}
          />
        ))}
      </div>
    </section>
  );
}