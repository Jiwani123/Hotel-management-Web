import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { UtensilsCrossed } from "lucide-react";
import api from "../lib/api";
import ImageCarousel from "../ui/ImageCarousel";

export default function MenuItemDetailsPage() {
  const { id } = useParams();

  const { data: item, isLoading, isError } = useQuery({
    queryKey: ["public-menu-item", id],
    queryFn: async () => (await api.get(`/public/menu/${id}`)).data.data,
    enabled: !!id,
  });

  if (isLoading) return <div className="card">Loading item…</div>;
  if (isError || !item) return <div className="card">Item not found.</div>;

  const images = (item.images ?? []).filter(Boolean);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {images.length > 0 ? (
          <ImageCarousel images={images} height={360} autoPlayMs={4200} borderRadius={0} />
        ) : (
          <div style={{ height: 240, display: "grid", placeItems: "center" }} className="muted">No images</div>
        )}

        <div style={{ padding: 18 }}>
          <div className="row space" style={{ alignItems: "flex-start", gap: 14 }}>
            <div style={{ minWidth: 0 }}>
              <div className="row" style={{ gap: 10, alignItems: "center" }}>
                <UtensilsCrossed size={18} className="icon-accent" />
                <h2 style={{ margin: 0, fontFamily: "Playfair Display, serif" }}>{item.name}</h2>
              </div>
              <div className="muted" style={{ marginTop: 6 }}>{item.category}</div>
              <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                {item.isAvailable === false ? "Currently unavailable" : "Available"}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div className="accent-price" style={{ fontSize: 22, fontWeight: 800 }}>LKR {Number(item.price).toFixed(2)}</div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <Link to="/guest/dining" className="btn ghost">Back to dining</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
