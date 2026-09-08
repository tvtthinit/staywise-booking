export type Hotel = {
  id: number
  name: string
  city: string
  country: string
  rating: number
  reviewCount: number
  price: number
  image: string
  gallery?: string[]
  tags: string[]
  description: string
}

export type SearchState = {
  destination: string
  checkIn: string
  checkOut: string
  guests: number
}

export type Room = {
  id: number
  hotel: number
  name: string
  description: string
  capacity: number
  price: number
  features: string[]
}

export type Booking = {
  id: number
  confirmation_code: string
  hotel: number
  hotel_name: string
  room?: number
  room_name?: string
  guest_name: string
  email: string
  check_in: string
  check_out: string
  guests: number
  status: string
  created_at: string
}

export type GuestProfile = {
  email: string
  full_name: string
  phone: string
  address: string
  preferences: string[]
}

export type Review = {
  id: number
  hotel: number
  guest_name: string
  rating: number
  comment: string
  created_at: string
}

export const sampleHotels: Hotel[] = [
  {
    id: 1,
    name: 'The Hoxton, Amsterdam',
    city: 'Amsterdam',
    country: 'Netherlands',
    rating: 4.8,
    reviewCount: 1284,
    price: 189,
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85',
    tags: ['Canal view', 'Breakfast included'],
    description: 'A characterful stay on the Herengracht, steps from the city\'s quietest corners.',
  },
  {
    id: 2,
    name: 'Casa Cook Rhodes',
    city: 'Rhodes',
    country: 'Greece',
    rating: 4.9,
    reviewCount: 867,
    price: 247,
    image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=85',
    tags: ['Adults only', 'Pool'],
    description: 'Sun-washed rooms, local craft and an unhurried rhythm beside the Aegean.',
  },
  {
    id: 3,
    name: 'The Hoxton, Williamsburg',
    city: 'New York',
    country: 'United States',
    rating: 4.7,
    reviewCount: 2140,
    price: 212,
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=85',
    tags: ['Rooftop bar', 'City views'],
    description: 'A lively Brooklyn base with generous rooms and a skyline-facing rooftop.',
  },
]
