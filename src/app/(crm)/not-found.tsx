import Link from "next/link";
export default function NotFound() {
  return <div className="py-20 text-center"><p className="text-muted">Introuvable.</p><Link href="/" className="btn-ghost mt-4">Retour</Link></div>;
}
