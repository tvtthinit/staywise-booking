from django.db import models


class Hotel(models.Model):
    name = models.CharField(max_length=180)
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    rating = models.DecimalField(max_digits=2, decimal_places=1, default=4.5)
    review_count = models.PositiveIntegerField(default=0)
    price = models.PositiveIntegerField()
    image = models.URLField()
    tags = models.JSONField(default=list)
    description = models.TextField()

    def __str__(self):
        return self.name


class HotelImage(models.Model):
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='gallery')
    image = models.URLField()
    caption = models.CharField(max_length=160, blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'id']

    def __str__(self):
        return f'{self.hotel.name} image {self.sort_order + 1}'


class Room(models.Model):
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='rooms')
    name = models.CharField(max_length=140)
    description = models.TextField(blank=True)
    capacity = models.PositiveSmallIntegerField(default=2)
    price = models.PositiveIntegerField()
    features = models.JSONField(default=list)

    def __str__(self):
        return f'{self.hotel.name} - {self.name}'


class GuestProfile(models.Model):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=160)
    phone = models.CharField(max_length=40, blank=True)
    address = models.CharField(max_length=240, blank=True)
    preferences = models.JSONField(default=list)

    def __str__(self):
        return self.full_name


class Promotion(models.Model):
    code = models.CharField(max_length=40, unique=True)
    description = models.CharField(max_length=180)
    discount_percent = models.PositiveSmallIntegerField()
    active = models.BooleanField(default=True)

    def __str__(self):
        return self.code


class Booking(models.Model):
    confirmation_code = models.CharField(max_length=20, unique=True)
    hotel = models.ForeignKey(Hotel, on_delete=models.PROTECT, related_name='bookings')
    room = models.ForeignKey(Room, on_delete=models.PROTECT, related_name='bookings', null=True, blank=True)
    guest_name = models.CharField(max_length=160)
    email = models.EmailField()
    check_in = models.DateField()
    check_out = models.DateField()
    guests = models.PositiveSmallIntegerField(default=1)
    status = models.CharField(max_length=20, default='confirmed')
    promotion = models.ForeignKey(Promotion, on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.confirmation_code


class Payment(models.Model):
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='payment')
    amount = models.PositiveIntegerField()
    status = models.CharField(max_length=20, default='paid')
    method = models.CharField(max_length=30, default='demo_card')
    created_at = models.DateTimeField(auto_now_add=True)


class Refund(models.Model):
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='refund')
    amount = models.PositiveIntegerField()
    status = models.CharField(max_length=20, default='requested')
    reason = models.CharField(max_length=240, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Review(models.Model):
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='reviews')
    guest_name = models.CharField(max_length=160)
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.hotel.name} - {self.rating}/5'
