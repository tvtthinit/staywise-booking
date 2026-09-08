from rest_framework import serializers
from .models import Booking, GuestProfile, Hotel, HotelImage, Payment, Promotion, Refund, Review, Room


class HotelSerializer(serializers.ModelSerializer):
    gallery = serializers.SerializerMethodField()

    def get_gallery(self, hotel):
        images = list(hotel.gallery.values_list('image', flat=True))
        return images or [hotel.image]

    class Meta:
        model = Hotel
        fields = ['id', 'name', 'city', 'country', 'rating', 'review_count', 'price', 'image', 'gallery', 'tags', 'description']


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['id', 'hotel', 'name', 'description', 'capacity', 'price', 'features']


class BookingSerializer(serializers.ModelSerializer):
    promotion_code = serializers.CharField(write_only=True, required=False, allow_blank=True)
    room_name = serializers.CharField(source='room.name', read_only=True)
    hotel_name = serializers.CharField(source='hotel.name', read_only=True)

    class Meta:
        model = Booking
        fields = ['id', 'confirmation_code', 'hotel', 'hotel_name', 'room', 'room_name', 'guest_name', 'email', 'check_in', 'check_out', 'guests', 'status', 'promotion_code', 'created_at']
        read_only_fields = ['id', 'confirmation_code', 'status', 'created_at']

    def validate(self, attrs):
        room = attrs.get('room')
        hotel = attrs.get('hotel')
        if room and room.hotel_id != hotel.id:
            raise serializers.ValidationError({'room': 'This room belongs to another hotel.'})
        if attrs['check_out'] <= attrs['check_in']:
            raise serializers.ValidationError({'check_out': 'Check-out must be after check-in.'})
        if room and room.capacity < attrs.get('guests', 1):
            raise serializers.ValidationError({'guests': 'This room cannot accommodate that many guests.'})
        overlapping = Booking.objects.filter(room=room, status='confirmed', check_in__lt=attrs['check_out'], check_out__gt=attrs['check_in'])
        if room and overlapping.exists():
            raise serializers.ValidationError({'room': 'This room is not available for those dates.'})
        return attrs

    def create(self, validated_data):
        import secrets
        code = validated_data.pop('promotion_code', '')
        promotion = Promotion.objects.filter(code__iexact=code, active=True).first() if code else None
        return Booking.objects.create(
            confirmation_code=f'SW-{secrets.token_hex(3).upper()}',
            promotion=promotion,
            **validated_data,
        )


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['booking', 'amount', 'status', 'method', 'created_at']
        read_only_fields = ['status', 'created_at']


class RefundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Refund
        fields = ['booking', 'amount', 'status', 'reason', 'created_at']
        read_only_fields = ['status', 'created_at']


class GuestProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuestProfile
        fields = ['email', 'full_name', 'phone', 'address', 'preferences']


class PromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promotion
        fields = ['code', 'description', 'discount_percent']


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['id', 'hotel', 'guest_name', 'rating', 'comment', 'created_at']
        read_only_fields = ['created_at']

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value
