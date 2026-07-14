import Image from 'next/image';

interface Props {
  locale: string;
}

interface Photo {
  src: string;
  altEn: string;
  altEl: string;
  className: string;
  sizes: string;
}

const PHOTOS: Photo[] = [
  {
    src: '/images/about-taverna.jpg',
    altEn: 'Taverna table set by the sea',
    altEl: 'Στρωμένο τραπέζι ταβέρνας δίπλα στη θάλασσα',
    className: 'col-span-2 row-span-2',
    sizes: '(min-width: 768px) 50vw, 100vw',
  },
  {
    src: '/images/about-beach.jpg',
    altEn: 'Quiet beach cove with clear Aegean water',
    altEl: 'Ήσυχος κολπίσκος με καθαρά νερά του Αιγαίου',
    className: 'col-span-2 md:col-span-2 md:row-span-1',
    sizes: '(min-width: 768px) 50vw, 100vw',
  },
  {
    src: '/images/about-village.jpg',
    altEn: 'Whitewashed village alley on the island',
    altEl: 'Ασβεστωμένο σοκάκι χωριού στο νησί',
    className: 'col-span-2 md:col-span-2 md:row-span-1',
    sizes: '(min-width: 768px) 50vw, 100vw',
  },
];

export function PhotoMosaic({ locale }: Props) {
  return (
    <section className="border-b bg-background" aria-label={locale === 'en' ? 'Island photos' : 'Φωτογραφίες του νησιού'}>
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <ul className="grid auto-rows-[170px] grid-cols-2 gap-3 md:auto-rows-[220px] md:grid-cols-4 md:gap-4">
          {PHOTOS.map((photo) => (
            <li key={photo.src} className={`relative overflow-hidden rounded-2xl ${photo.className}`}>
              <Image
                src={photo.src}
                alt={locale === 'en' ? photo.altEn : photo.altEl}
                fill
                sizes={photo.sizes}
                className="object-cover transition-transform duration-500 hover:scale-105"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
