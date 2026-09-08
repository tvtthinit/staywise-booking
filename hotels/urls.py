from django.urls import path
from .views import BookingActionView, BookingCreateView, BookingListView, DestinationListView, GuestProfileView, HotelDetailView, HotelListView, PaymentCreateView, PromotionView, ReviewListCreateView, RoomListView

urlpatterns = [
    path('hotels/', HotelListView.as_view(), name='hotel-list'),
    path('hotels/<int:pk>/', HotelDetailView.as_view(), name='hotel-detail'),
    path('destinations/', DestinationListView.as_view(), name='destination-list'),
    path('rooms/', RoomListView.as_view(), name='room-list'),
    path('bookings/', BookingCreateView.as_view(), name='booking-create'),
    path('bookings/history/', BookingListView.as_view(), name='booking-history'),
    path('bookings/<str:confirmation_code>/<str:action>/', BookingActionView.as_view(), name='booking-action'),
    path('payments/', PaymentCreateView.as_view(), name='payment-create'),
    path('promotions/', PromotionView.as_view(), name='promotion-list'),
    path('profile/', GuestProfileView.as_view(), name='guest-profile'),
    path('hotels/<int:hotel_id>/reviews/', ReviewListCreateView.as_view(), name='review-list-create'),
]
