from django.contrib import admin
from .models import Booking, GuestProfile, Hotel, HotelImage, Payment, Promotion, Refund, Review, Room

admin.site.register(Hotel)
admin.site.register(HotelImage)
admin.site.register(Booking)
admin.site.register(Room)
admin.site.register(GuestProfile)
admin.site.register(Promotion)
admin.site.register(Payment)
admin.site.register(Refund)
admin.site.register(Review)
