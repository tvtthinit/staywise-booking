import { sampleHotels, type Booking, type GuestProfile, type Hotel, type Review, type Room, type SearchState } from './types'

export async function searchHotels(search: SearchState): Promise<Hotel[]> {
  try {
    const params = new URLSearchParams({ destination: search.destination })
    const response = await fetch(`/api/hotels/?${params}`)
    if (!response.ok) throw new Error('API unavailable')
    return await response.json()
  } catch {
    const query = search.destination.trim().toLowerCase()
    return query
      ? sampleHotels.filter((hotel) => `${hotel.name} ${hotel.city} ${hotel.country}`.toLowerCase().includes(query))
      : sampleHotels
  }
}

export async function listRooms(hotelId: number, search: SearchState): Promise<Room[]> {
  try {
    const params = new URLSearchParams({ hotel: String(hotelId), guests: String(search.guests), check_in: search.checkIn, check_out: search.checkOut })
    const response = await fetch(`/api/rooms/?${params}`)
    if (!response.ok) throw new Error('API unavailable')
    return await response.json()
  } catch {
    return []
  }
}

export async function createBooking(payload: { hotelId: number; roomId?: number; guestName: string; email: string; promotionCode?: string; search: SearchState }): Promise<Booking> {
  try {
    const response = await fetch('/api/bookings/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hotel: payload.hotelId, room: payload.roomId, guest_name: payload.guestName, email: payload.email, promotion_code: payload.promotionCode, check_in: payload.search.checkIn, check_out: payload.search.checkOut, guests: payload.search.guests }),
    })
    if (!response.ok) throw new Error('API unavailable')
    return await response.json()
  } catch {
    return { id: 0, confirmation_code: `SW-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, hotel: payload.hotelId, hotel_name: '', guest_name: payload.guestName, email: payload.email, check_in: payload.search.checkIn, check_out: payload.search.checkOut, guests: payload.search.guests, status: 'confirmed', created_at: new Date().toISOString() }
  }
}

export async function getBookingHistory(email: string): Promise<Booking[]> {
  const response = await fetch(`/api/bookings/history/?email=${encodeURIComponent(email)}`)
  if (!response.ok) throw new Error('Unable to load booking history')
  return response.json()
}

export async function bookingAction(code: string, action: 'cancel' | 'refund', reason = '') {
  const response = await fetch(`/api/bookings/${code}/${action}/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) })
  if (!response.ok) throw new Error('Unable to update booking')
  return response.json()
}

export async function payBooking(booking: number, amount: number) {
  const response = await fetch('/api/payments/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ booking, amount }) })
  if (!response.ok) throw new Error('Unable to process payment')
  return response.json()
}

export async function saveProfile(profile: GuestProfile) {
  const response = await fetch('/api/profile/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) })
  if (!response.ok) throw new Error('Unable to save profile')
  return response.json()
}

export async function validatePromotion(code: string) {
  const response = await fetch(`/api/promotions/?code=${encodeURIComponent(code)}`)
  if (!response.ok) throw new Error('Unable to validate promotion')
  const promotions = await response.json()
  return promotions[0]
}

export async function getReviews(hotelId: number): Promise<Review[]> {
  const response = await fetch(`/api/hotels/${hotelId}/reviews/`)
  if (!response.ok) throw new Error('Unable to load reviews')
  return response.json()
}

export async function submitReview(review: Omit<Review, 'id' | 'created_at'>) {
  const response = await fetch(`/api/hotels/${review.hotel}/reviews/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(review) })
  if (!response.ok) throw new Error('Unable to submit review')
  return response.json()
}
