import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Coffee, MapPin, Search, ShieldCheck, Star, Users, Waves, Wifi } from 'lucide-react'
import { bookingAction, createBooking, getBookingHistory, getReviews, listRooms, saveProfile, searchHotels, submitReview, validatePromotion } from './api'
import { sampleHotels, type Booking, type GuestProfile, type Hotel, type Review, type Room, type SearchState } from './types'

const initialSearch: SearchState = { destination: '', checkIn: '2026-10-12', checkOut: '2026-10-16', guests: 2 }

function chooseFeaturedHotels(hotels: Hotel[]) {
  const candidates = [...hotels].sort((first, second) => second.rating - first.rating).slice(0, 30)
  return candidates.sort(() => Math.random() - 0.5).slice(0, 5)
}

function App() {
  const [search, setSearch] = useState(initialSearch)
  const [page, setPage] = useState<'home' | 'why' | 'trips' | 'profile'>(() => {
    const path = window.location.pathname
    return path === '/why' ? 'why' : path === '/trips' ? 'trips' : path === '/profile' ? 'profile' : 'home'
  })
  const [hotels, setHotels] = useState<Hotel[]>(sampleHotels)
  const [featuredHotels, setFeaturedHotels] = useState<Hotel[]>(chooseFeaturedHotels(sampleHotels))
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [detailImageIndex, setDetailImageIndex] = useState(0)
  const [visibleHotelCount, setVisibleHotelCount] = useState(12)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(() => {
    const match = window.location.pathname.match(/^\/hotels\/(\d+)\/?$/)
    return match ? sampleHotels.find((hotel) => hotel.id === Number(match[1])) || null : null
  })
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [promotionCode, setPromotionCode] = useState('')
  const [promotionMessage, setPromotionMessage] = useState('')
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewName, setReviewName] = useState('')
  const [reviewComment, setReviewComment] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [bookingCode, setBookingCode] = useState('')
  const [guestName, setGuestName] = useState('')
  const [email, setEmail] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [workspace, setWorkspace] = useState<'home' | 'trips' | 'profile'>('home')
  const [history, setHistory] = useState<Booking[]>([])
  const [tripEmail, setTripEmail] = useState('')
  const [profile, setProfile] = useState<GuestProfile>({ email: '', full_name: '', phone: '', address: '', preferences: [] })

  function navigateTo(nextPage: 'home' | 'why' | 'trips' | 'profile') {
    window.history.pushState({}, '', nextPage === 'home' ? '/' : `/${nextPage}`)
    setPage(nextPage)
    setWorkspace(nextPage === 'home' ? 'home' : nextPage === 'why' ? 'home' : nextPage)
    if (nextPage === 'home') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    let isCurrent = true
    searchHotels(initialSearch).then((results) => {
      if (isCurrent) {
        setHotels(results)
        setFeaturedHotels(chooseFeaturedHotels(results))
      }
    })
    return () => {
      isCurrent = false
    }
  }, [])

  useEffect(() => {
    if (featuredHotels.length < 2) return
    const timer = window.setInterval(() => setFeaturedIndex((index) => (index + 1) % featuredHotels.length), 5000)
    return () => window.clearInterval(timer)
  }, [featuredHotels.length])

  useEffect(() => {
    function handleScroll() {
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 500
      if (nearBottom && workspace === 'home' && !selectedHotel && visibleHotelCount < hotels.length && !isLoadingMore) {
        setIsLoadingMore(true)
        window.setTimeout(() => {
          setVisibleHotelCount((count) => Math.min(count + 12, hotels.length))
          setIsLoadingMore(false)
        }, 250)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hotels.length, isLoadingMore, selectedHotel, visibleHotelCount, workspace])

  async function openHotel(hotel: Hotel) {
    window.history.pushState({}, '', `/hotels/${hotel.id}`)
    setSelectedHotel(hotel)
    setDetailImageIndex(0)
    setSelectedRoom(null)
    setPromotionCode('')
    setPromotionMessage('')
    setBookingCode('')
    const [availableRooms, hotelReviews] = await Promise.all([listRooms(hotel.id, search), getReviews(hotel.id).catch(() => [])])
    setRooms(availableRooms)
    setReviews(hotelReviews)
  }

  function closeHotel() {
    window.history.pushState({}, '', '/')
    setSelectedHotel(null)
  }

  const galleryImages = selectedHotel?.gallery?.length ? selectedHotel.gallery : selectedHotel ? [selectedHotel.image] : []

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault()
    setIsSearching(true)
    const results = await searchHotels(search)
    setHotels(results)
    setFeaturedHotels(chooseFeaturedHotels(results))
    setFeaturedIndex(0)
    setVisibleHotelCount(12)
    navigateTo('home')
    setIsSearching(false)
    document.getElementById('stays')?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleBooking(event: React.FormEvent) {
    event.preventDefault()
    const result = await createBooking({ hotelId: selectedHotel!.id, roomId: selectedRoom?.id, guestName, email, promotionCode, search })
    setBookingCode(result.confirmation_code)
  }

  async function handleReview(event: React.FormEvent) {
    event.preventDefault()
    if (!selectedHotel) return
    const review = await submitReview({ hotel: selectedHotel.id, guest_name: reviewName, rating: reviewRating, comment: reviewComment })
    setReviews([review, ...reviews])
    setReviewName('')
    setReviewComment('')
  }

  async function loadHistory() {
    const lookupEmail = tripEmail || email
    if (!lookupEmail) {
      navigateTo('trips')
      return
    }
    setTripEmail(lookupEmail)
    setHistory(await getBookingHistory(lookupEmail))
    navigateTo('trips')
  }

  async function handleTripLookup(event: React.FormEvent) {
    event.preventDefault()
    await loadHistory()
  }

  async function handleProfile(event: React.FormEvent) {
    event.preventDefault()
    await saveProfile(profile)
    setEmail(profile.email)
    setGuestName(profile.full_name)
  }

  async function handlePromotion() {
    const promotion = await validatePromotion(promotionCode)
    setPromotionMessage(promotion ? `${promotion.description} (${promotion.discount_percent}% off)` : 'That code is not active.')
  }

  return (
    <main className={selectedHotel ? 'detail-mode' : ''}>
      <nav className="nav shell">
        <a className="brand" href="/" onClick={(event) => { event.preventDefault(); selectedHotel ? closeHotel() : navigateTo('home') }}>stay<span>wise</span></a>
        <div className="nav-links"><a href="/#stays" onClick={(event) => { event.preventDefault(); navigateTo('home'); window.setTimeout(() => document.getElementById('stays')?.scrollIntoView({ behavior: 'smooth' }), 0) }}>Explore stays</a><a href="/why" onClick={(event) => { event.preventDefault(); navigateTo('why') }}>Why Staywise</a><button onClick={loadHistory}>My trips</button><a href="/profile" onClick={(event) => { event.preventDefault(); navigateTo('profile') }}>Profile</a></div>
        <button className="nav-login">List your property <ArrowRight size={16} /></button>
      </nav>

      {page === 'home' && <section className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow">Highly rated, randomly selected</p>
          <h1>Stay somewhere<br /><em>worth remembering.</em></h1>
          <p className="hero-text">Five standout stays from our highest-rated collection, refreshed every visit. Find a place with a little more soul.</p>
          {featuredHotels.length > 0 && <button className="hero-link" onClick={() => openHotel(featuredHotels[featuredIndex])}>Explore {featuredHotels[featuredIndex].name} <ArrowRight size={16} /></button>}
        </div>
        {featuredHotels.length > 0 && <div className="hero-slider"><img src={featuredHotels[featuredIndex].image} alt={featuredHotels[featuredIndex].name} /><div className="featured-label"><p>Featured stay</p><strong>{featuredHotels[featuredIndex].name}</strong><span><MapPin size={13} /> {featuredHotels[featuredIndex].city}, {featuredHotels[featuredIndex].country}</span><b><Star size={13} fill="currentColor" /> {featuredHotels[featuredIndex].rating}</b></div><div className="slider-controls"><button onClick={() => setFeaturedIndex((featuredIndex - 1 + featuredHotels.length) % featuredHotels.length)} aria-label="Previous featured hotel"><ChevronLeft size={18} /></button><span>{featuredIndex + 1} / {featuredHotels.length}</span><button onClick={() => setFeaturedIndex((featuredIndex + 1) % featuredHotels.length)} aria-label="Next featured hotel"><ChevronRight size={18} /></button></div></div>}
      </section>}

      {page === 'home' && <form className="search-panel shell" onSubmit={handleSearch}>
        <label className="search-field destination"><MapPin size={19} /><span><small>Search hotels</small><input value={search.destination} onChange={(event) => setSearch({ ...search, destination: event.target.value })} placeholder="Hotel or destination" /></span></label>
        <label className="search-field"><CalendarDays size={19} /><span><small>Check in</small><input type="date" value={search.checkIn} onChange={(event) => setSearch({ ...search, checkIn: event.target.value })} /></span></label>
        <label className="search-field"><CalendarDays size={19} /><span><small>Check out</small><input type="date" value={search.checkOut} onChange={(event) => setSearch({ ...search, checkOut: event.target.value })} /></span></label>
        <label className="search-field guests"><Users size={19} /><span><small>Guests</small><select value={search.guests} onChange={(event) => setSearch({ ...search, guests: Number(event.target.value) })}><option value={1}>1 guest</option><option value={2}>2 guests</option><option value={3}>3 guests</option><option value={4}>4 guests</option></select></span><ChevronDown size={16} /></label>
        <button className="search-button" type="submit" aria-label="Search stays">{isSearching ? '...' : <Search size={21} />}</button>
      </form>}

      {page === 'home' && <section className="stays shell" id="stays">
        <div className="section-heading"><div><p className="eyebrow">Handpicked for you</p><h2>Places with a point of view</h2></div><button className="text-button">View all stays <ArrowRight size={17} /></button></div>
        <div className="hotel-grid">{hotels.length ? hotels.slice(0, visibleHotelCount).map((hotel, index) => <article className="hotel-card" key={hotel.id} style={{ animationDelay: `${index % 12 * 100}ms` }}><div className="hotel-image" role="link" tabIndex={0} onClick={() => openHotel(hotel)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openHotel(hotel) }} aria-label={`View details for ${hotel.name}`}><img src={hotel.image} alt={hotel.name} /><span className="save">♡</span></div><div className="hotel-details"><div className="hotel-title"><div><a className="hotel-name-link" href={`/hotels/${hotel.id}`} onClick={(event) => { event.preventDefault(); openHotel(hotel) }}><h3>{hotel.name}</h3></a><p><MapPin size={14} /> {hotel.city}, {hotel.country}</p></div><span className="rating"><Star size={14} fill="currentColor" /> {hotel.rating}</span></div><p className="description">{hotel.description}</p><div className="hotel-footer"><div><strong>${hotel.price}</strong> <span>/ night</span></div><span className="detail-hint">View hotel details <ArrowRight size={15} /></span></div></div></article>) : <p className="empty">No stays found for that destination. Try Amsterdam, Rhodes, or New York.</p>}</div>
        {hotels.length > visibleHotelCount && <p className="load-more-status">{isLoadingMore ? 'Loading more stays...' : 'Scroll for more stays'}</p>}
      </section>}

      {page === 'home' && <section className="why" id="why"><div className="shell why-inner"><div><p className="eyebrow">The Staywise standard</p><h2>More than a room.<br /><em>A better way to travel.</em></h2></div><div className="perks"><div><ShieldCheck /><h3>Clear by design</h3><p>No surprise fees. No confusing fine print. Just the details you need.</p></div><div><Star /><h3>Chosen with care</h3><p>Independent places and memorable stays, reviewed by real people.</p></div><div><Users /><h3>Human when it matters</h3><p>Helpful support from booking to check-out, whenever you need it.</p></div></div></div></section>}

      {page !== 'home' && <section className="account-panel page-view shell">{page === 'why' ? <><p className="eyebrow">The Staywise standard</p><h2>More than a room.<br /><em>A better way to travel.</em></h2><div className="perks page-perks"><div><ShieldCheck /><h3>Clear by design</h3><p>No surprise fees. No confusing fine print. Just the details you need.</p></div><div><Star /><h3>Chosen with care</h3><p>Independent places and memorable stays, reviewed by real people.</p></div><div><Users /><h3>Human when it matters</h3><p>Helpful support from booking to check-out, whenever you need it.</p></div></div></> : page === 'trips' ? <><p className="eyebrow">Your stays</p><h2>My trips</h2><p className="account-intro">Look up your reservations with the email used for booking.</p><form className="trip-lookup" onSubmit={handleTripLookup}><input required type="email" value={tripEmail} onChange={(event) => setTripEmail(event.target.value)} placeholder="you@example.com" aria-label="Booking email" /><button className="primary-button" type="submit">Find my trips <ArrowRight size={16} /></button></form>{history.length ? history.map((booking) => <div className="history-row" key={booking.confirmation_code}><div><strong>{booking.hotel_name || 'Staywise hotel'}</strong><span>{booking.check_in} to {booking.check_out} · {booking.room_name || 'Room selected'}</span><small>{booking.confirmation_code} · {booking.status}</small></div>{booking.status === 'confirmed' && <div className="history-actions"><button className="text-button" onClick={() => bookingAction(booking.confirmation_code, 'cancel').then(loadHistory)}>Cancel booking</button><button className="text-button" onClick={() => bookingAction(booking.confirmation_code, 'refund', 'Guest requested a refund').then(loadHistory)}>Request refund</button></div>}</div>) : <p className="empty">No reservations loaded yet.</p>}</> : <><p className="eyebrow">Guest account</p><h2>Manage your profile</h2><form className="profile-form" onSubmit={handleProfile}><label>Email<input required type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></label><label>Full name<input required value={profile.full_name} onChange={(event) => setProfile({ ...profile, full_name: event.target.value })} /></label><label>Phone<input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label><label>Address<input value={profile.address} onChange={(event) => setProfile({ ...profile, address: event.target.value })} /></label><button className="primary-button" type="submit">Save profile <Check size={16} /></button></form></>}</section>}

      {selectedHotel && <div className="hotel-detail-route"><div className="modal-backdrop" role="presentation"><div className="modal hotel-detail-modal"><button className="modal-close" onClick={closeHotel} aria-label="Back to home">×</button>{bookingCode ? <div className="confirmation"><div className="check"><Check /></div><p className="eyebrow">You are all set</p><h2>Your stay is confirmed.</h2><p>We sent the details for {selectedHotel.name} to {email}.</p><strong>{bookingCode}</strong><button className="primary-button" onClick={closeHotel}>Done</button></div> : <><div className="detail-gallery"><img className="detail-image" src={galleryImages[detailImageIndex]} alt={`${selectedHotel.name} gallery image ${detailImageIndex + 1}`} /><button className="gallery-arrow gallery-prev" onClick={() => setDetailImageIndex((index) => (index - 1 + galleryImages.length) % galleryImages.length)} aria-label="Previous hotel image"><ChevronLeft size={20} /></button><button className="gallery-arrow gallery-next" onClick={() => setDetailImageIndex((index) => (index + 1) % galleryImages.length)} aria-label="Next hotel image"><ChevronRight size={20} /></button><span className="gallery-count">{detailImageIndex + 1} / {galleryImages.length}</span></div><div className="detail-content"><div className="detail-heading"><div><p className="eyebrow">A considered stay</p><h2>{selectedHotel.name}</h2><p className="modal-location"><MapPin size={14} /> {selectedHotel.city}, {selectedHotel.country}</p></div><span className="rating"><Star size={14} fill="currentColor" /> {selectedHotel.rating} <small>({selectedHotel.reviewCount})</small></span></div><p className="detail-description">{selectedHotel.description}</p><div className="detail-tags">{selectedHotel.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="detail-amenities"><span><Wifi size={16} /> Wi-Fi</span><span><Coffee size={16} /> Breakfast</span><span><Waves size={16} /> Pool access</span></div><div className="room-picker"><p className="eyebrow">Compare available rooms</p>{rooms.length ? rooms.map((room) => <button className={selectedRoom?.id === room.id ? 'room-option selected' : 'room-option'} key={room.id} onClick={() => setSelectedRoom(room)}><span><strong>{room.name}</strong><small>{room.description}</small><small>{room.features.join(' · ')}</small></span><b>${room.price}<small>/ night</small></b></button>) : <p className="empty">No rooms are available for these dates.</p>}</div><div className="promo-row"><input value={promotionCode} onChange={(event) => setPromotionCode(event.target.value.toUpperCase())} placeholder="Promo code" /><button className="text-button" type="button" onClick={handlePromotion}>Apply</button></div>{promotionMessage && <p className="promo-message">{promotionMessage}</p>}<div className="booking-summary"><span>{search.checkIn} to {search.checkOut}<small>{search.guests} guests</small></span><strong>${selectedRoom?.price || selectedHotel.price} <small>/ night</small></strong></div><form onSubmit={handleBooking}><label>Your name<input required value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="Alex Morgan" /></label><label>Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="alex@example.com" /></label><button className="primary-button" disabled={!rooms.length} type="submit">Confirm reservation <ArrowRight size={16} /></button></form><div className="review-section"><p className="eyebrow">Guest reviews</p>{reviews.length ? reviews.slice(0, 3).map((review) => <div className="review-row" key={review.id}><strong>{'★'.repeat(review.rating)}</strong><span>{review.comment}</span><small>{review.guest_name}</small></div>) : <p className="empty">Be the first to review this stay.</p>}<form className="review-form" onSubmit={handleReview}><input required value={reviewName} onChange={(event) => setReviewName(event.target.value)} placeholder="Your name" /><select value={reviewRating} onChange={(event) => setReviewRating(Number(event.target.value))}><option value={5}>5 stars</option><option value={4}>4 stars</option><option value={3}>3 stars</option><option value={2}>2 stars</option><option value={1}>1 star</option></select><textarea required value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} placeholder="Share your stay" /><button className="text-button" type="submit">Submit review</button></form></div><p className="secure"><ShieldCheck size={14} /> Free cancellation up to 48 hours before check-in</p></div></>}</div></div></div>}
    </main>
  )
}

export default App
