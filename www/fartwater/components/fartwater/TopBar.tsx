import Link from 'next/link';

export function TopBar() {
  const socials = [
    { label: 'X', href: 'https://x.com/6fartwater9' },
    { label: 'YouTube', href: 'https://www.youtube.com/channel/UCkS_lxupiHoQn2P3-h86Chw' },
    { label: 'TikTok', href: 'https://tiktok.com/@6fartwater9' },
    { label: 'Instagram', href: 'https://instagram.com/6fartwater9' },
    { label: 'Discord', href: 'https://discord.gg/Cm2Xfw5H82' },
    { label: 'Telegram', href: 'https://t.me/frtwtr' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur border-b border-white/10">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="text-xl md:text-2xl font-black text-yellow-400">
          FartWATER
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {socials.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-300 hover:text-white"
            >
              {social.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
