import { useState } from "react";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { STORE_INFO } from "@/app/config/store";

export function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Form submission logic here
    alert("Mensagem enviada! Entraremos em contato em breve.");
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-16">
      {/* Header */}
      <div className="mb-16">
        <h1 className="mb-4 text-4xl tracking-tight text-black">Contato</h1>
        <p className="max-w-2xl text-sm text-black/60">
          Entre em contato conosco. Estamos prontos para atender suas necessidades.
        </p>
      </div>

      <div className="grid gap-16 lg:grid-cols-2">
        {/* Contact Info */}
        <div className="space-y-8">
          <div className="space-y-6">
            <div className="flex gap-4">
              <Phone size={20} strokeWidth={1.5} className="text-black/60 flex-shrink-0" />
              <div>
                <h3 className="text-sm tracking-wide text-black mb-2">TELEFONES</h3>
                {STORE_INFO.phones.map((phone, index) => (
                  <div key={index} className="mb-2 last:mb-0">
                    <p className="text-sm text-black/60">{phone.display}</p>
                    <p className="text-xs text-black/40">{phone.label}</p>
                  </div>
                ))}
                <p className="text-xs text-black/40 mt-2">WhatsApp disponível</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Mail size={20} strokeWidth={1.5} className="text-black/60 flex-shrink-0" />
              <div>
                <h3 className="text-sm tracking-wide text-black mb-2">EMAIL</h3>
                <p className="text-sm text-black/60">{STORE_INFO.email.general}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <MapPin size={20} strokeWidth={1.5} className="text-black/60 flex-shrink-0" />
              <div>
                <h3 className="text-sm tracking-wide text-black mb-2">LOCALIZAÇÃO</h3>
                <p className="text-sm text-black/60">
                  {STORE_INFO.address.street},  {STORE_INFO.address.neighborhood}, {STORE_INFO.address.zipCode}
                  <br />
                  {STORE_INFO.address.city} - {STORE_INFO.address.state}
                  <br />
                  {STORE_INFO.address.notes}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Clock size={20} strokeWidth={1.5} className="text-black/60 flex-shrink-0" />
              <div>
                <h3 className="text-sm tracking-wide text-black mb-2">HORÁRIO</h3>
                <p className="text-sm text-black/60">
                  {STORE_INFO.hours.weekdays}
                  <br />
                  {STORE_INFO.hours.saturday}
                  <br />
                  {STORE_INFO.hours.sunday}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-xs tracking-wide text-black mb-2">
                NOME *
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-black/10 px-4 py-3 text-sm text-black focus:border-black focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs tracking-wide text-black mb-2">
                EMAIL *
              </label>
              <input
                type="email"
                id="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border border-black/10 px-4 py-3 text-sm text-black focus:border-black focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-xs tracking-wide text-black mb-2">
                ASSUNTO *
              </label>
              <input
                type="text"
                id="subject"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full border border-black/10 px-4 py-3 text-sm text-black focus:border-black focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-xs tracking-wide text-black mb-2">
                MENSAGEM *
              </label>
              <textarea
                id="message"
                required
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full border border-black/10 px-4 py-3 text-sm text-black focus:border-black focus:outline-none transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-black px-8 py-4 text-sm tracking-wide text-white hover:bg-black/90 transition-colors"
            >
              ENVIAR MENSAGEM
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
