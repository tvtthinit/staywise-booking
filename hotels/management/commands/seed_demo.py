import random

from django.core.management.base import BaseCommand
from hotels.models import Hotel, HotelImage, Promotion, Room


HOTELS = [
    {
        'name': 'The Hoxton, Amsterdam', 'city': 'Amsterdam', 'country': 'Netherlands', 'rating': 4.8, 'review_count': 1284, 'price': 189,
        'image': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85', 'tags': ['Canal view', 'Breakfast included'],
        'description': "A characterful stay on the Herengracht, steps from the city's quietest corners.",
    },
    {
        'name': 'Casa Cook Rhodes', 'city': 'Rhodes', 'country': 'Greece', 'rating': 4.9, 'review_count': 867, 'price': 247,
        'image': 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=85', 'tags': ['Adults only', 'Pool'],
        'description': 'Sun-washed rooms, local craft and an unhurried rhythm beside the Aegean.',
    },
    {
        'name': 'The Hoxton, Williamsburg', 'city': 'New York', 'country': 'United States', 'rating': 4.7, 'review_count': 2140, 'price': 212,
        'image': 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=85', 'tags': ['Rooftop bar', 'City views'],
        'description': 'A lively Brooklyn base with generous rooms and a skyline-facing rooftop.',
    },
]

GALLERY_IMAGES = [
    ('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=85', 'The exterior and pool'),
    ('https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1400&q=85', 'A quiet poolside afternoon'),
    ('https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1400&q=85', 'A room made for settling in'),
    ('https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=85', 'Light-filled interiors'),
    ('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1400&q=85', 'A considered common space'),
]


class Command(BaseCommand):
    help = 'Loads the curated demo hotels used by the local app.'

    def add_arguments(self, parser):
        parser.add_argument('--random-count', type=int, default=0, help='Also create this many deterministic random demo hotels.')

    def save_gallery(self, hotel):
        for sort_order, (image, caption) in enumerate(GALLERY_IMAGES):
            HotelImage.objects.update_or_create(hotel=hotel, sort_order=sort_order, defaults={'image': image, 'caption': caption})

    def handle(self, *args, **options):
        room_templates = [
            ('Essential room', 'A calm room with thoughtful essentials and a comfortable queen bed.', 2, 1.0, ['Queen bed', 'Rain shower']),
            ('Signature suite', 'A generous suite with a separate sitting area and a view worth lingering over.', 3, 1.55, ['King bed', 'Living area', 'View']),
        ]
        for hotel in HOTELS:
            saved_hotel, _ = Hotel.objects.update_or_create(name=hotel['name'], defaults=hotel)
            self.save_gallery(saved_hotel)
            for name, description, capacity, multiplier, features in room_templates:
                Room.objects.update_or_create(
                    hotel=saved_hotel,
                    name=name,
                    defaults={
                        'description': description,
                        'capacity': capacity,
                        'price': round(hotel['price'] * multiplier),
                        'features': features,
                    },
                )
        random_count = max(0, options['random_count'])
        randomizer = random.Random(20260908)
        cities = [
            ('Lisbon', 'Portugal'), ('Kyoto', 'Japan'), ('Cape Town', 'South Africa'),
            ('Reykjavik', 'Iceland'), ('Marrakech', 'Morocco'), ('Melbourne', 'Australia'),
            ('Vancouver', 'Canada'), ('Florence', 'Italy'), ('Mexico City', 'Mexico'),
            ('Copenhagen', 'Denmark'), ('Bangkok', 'Thailand'), ('Dublin', 'Ireland'),
        ]
        adjectives = ['Quiet', 'Golden', 'Cedar', 'Luminous', 'Wander', 'Kindred', 'Moss', 'Harbor', 'Juniper', 'Open']
        nouns = ['House', 'Lodge', 'Hotel', 'Quarter', 'Retreat', 'Residence', 'Garden', 'Inn']
        for index in range(1, random_count + 1):
            city, country = randomizer.choice(cities)
            name = f'{randomizer.choice(adjectives)} {randomizer.choice(nouns)} {index:04d}'
            price = randomizer.randint(85, 420)
            saved_hotel, _ = Hotel.objects.update_or_create(
                name=name,
                defaults={
                    'city': city,
                    'country': country,
                    'rating': randomizer.choice([4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9]),
                    'review_count': randomizer.randint(12, 2400),
                    'price': price,
                    'image': randomizer.choice([
                        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85',
                        'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=85',
                        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=85',
                        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=85',
                    ]),
                    'tags': randomizer.sample(['Breakfast included', 'City views', 'Pool', 'Quiet rooms', 'Local guide', 'Spa access'], k=2),
                    'description': f'A characterful {name.lower()} in {city}, made for slow mornings and curious travelers.',
                },
            )
            self.save_gallery(saved_hotel)
            Room.objects.update_or_create(
                hotel=saved_hotel,
                name='Standard room',
                defaults={'description': 'A comfortable room with considered essentials.', 'capacity': 2, 'price': price, 'features': ['Queen bed', 'Wi-Fi']},
            )
            Room.objects.update_or_create(
                hotel=saved_hotel,
                name='Signature suite',
                defaults={'description': 'A generous suite with space to settle in.', 'capacity': 3, 'price': round(price * 1.55), 'features': ['King bed', 'Living area']},
            )
        Promotion.objects.update_or_create(code='WELCOME10', defaults={'description': '10% off your first Staywise booking.', 'discount_percent': 10, 'active': True})
        Promotion.objects.update_or_create(code='LONGSTAY15', defaults={'description': '15% off stays of five nights or more.', 'discount_percent': 15, 'active': True})
        self.stdout.write(self.style.SUCCESS(f'Loaded {len(HOTELS) + random_count} demo hotels.'))
