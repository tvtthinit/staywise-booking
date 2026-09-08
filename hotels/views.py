from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Booking, GuestProfile, Hotel, Payment, Promotion, Refund, Review, Room
from .serializers import BookingSerializer, GuestProfileSerializer, HotelSerializer, PaymentSerializer, PromotionSerializer, RefundSerializer, ReviewSerializer, RoomSerializer


class HotelListView(generics.ListAPIView):
    serializer_class = HotelSerializer

    def get_queryset(self):
        destination = self.request.query_params.get('destination', '').strip()
        queryset = Hotel.objects.all().order_by('-rating')
        if destination:
            queryset = queryset.filter(Q(name__icontains=destination) | Q(city__icontains=destination) | Q(country__icontains=destination))
        return queryset


class HotelDetailView(generics.RetrieveAPIView):
    queryset = Hotel.objects.all()
    serializer_class = HotelSerializer


class DestinationListView(APIView):
    def get(self, request):
        cities = list(Hotel.objects.values_list('city', flat=True).distinct().order_by('city'))
        countries = list(Hotel.objects.values_list('country', flat=True).distinct().order_by('country'))
        return Response({'cities': cities, 'countries': countries})


class RoomListView(generics.ListAPIView):
    serializer_class = RoomSerializer

    def get_queryset(self):
        queryset = Room.objects.all().order_by('price')
        hotel_id = self.request.query_params.get('hotel')
        guests = self.request.query_params.get('guests')
        if hotel_id:
            queryset = queryset.filter(hotel_id=hotel_id)
        if guests and guests.isdigit():
            queryset = queryset.filter(capacity__gte=int(guests))
        check_in = self.request.query_params.get('check_in')
        check_out = self.request.query_params.get('check_out')
        if check_in and check_out:
            booked = Booking.objects.filter(status='confirmed', check_in__lt=check_out, check_out__gt=check_in).values_list('room_id', flat=True)
            queryset = queryset.exclude(id__in=booked)
        return queryset


class BookingCreateView(APIView):
    def post(self, request):
        serializer = BookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        return Response(BookingSerializer(booking).data, status=201)


class BookingListView(generics.ListAPIView):
    serializer_class = BookingSerializer

    def get_queryset(self):
        queryset = Booking.objects.select_related('hotel', 'room').order_by('-created_at')
        email = self.request.query_params.get('email', '').strip()
        return queryset.filter(email__iexact=email) if email else queryset.none()


class BookingActionView(APIView):
    def post(self, request, confirmation_code, action):
        booking = get_object_or_404(Booking, confirmation_code=confirmation_code)
        if action == 'cancel':
            booking.status = 'cancelled'
            booking.save(update_fields=['status'])
            return Response({'status': booking.status, 'confirmation_code': booking.confirmation_code})
        if action == 'refund':
            refund, _ = Refund.objects.get_or_create(booking=booking, defaults={'amount': 0, 'reason': request.data.get('reason', '')})
            return Response(RefundSerializer(refund).data, status=201)
        return Response({'detail': 'Unsupported booking action.'}, status=400)


class PaymentCreateView(APIView):
    def post(self, request):
        serializer = PaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment, _ = Payment.objects.update_or_create(booking=serializer.validated_data['booking'], defaults={'amount': serializer.validated_data['amount'], 'method': serializer.validated_data.get('method', 'demo_card'), 'status': 'paid'})
        return Response(PaymentSerializer(payment).data, status=201)


class PromotionView(generics.ListAPIView):
    serializer_class = PromotionSerializer

    def get_queryset(self):
        code = self.request.query_params.get('code', '').strip()
        queryset = Promotion.objects.filter(active=True)
        return queryset.filter(code__iexact=code) if code else queryset


class GuestProfileView(APIView):
    def get(self, request):
        profile = get_object_or_404(GuestProfile, email__iexact=request.query_params.get('email', ''))
        return Response(GuestProfileSerializer(profile).data)

    def post(self, request):
        serializer = GuestProfileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile, _ = GuestProfile.objects.update_or_create(email=serializer.validated_data['email'], defaults=serializer.validated_data)
        return Response(GuestProfileSerializer(profile).data)


class ReviewListCreateView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer

    def get_queryset(self):
        queryset = Review.objects.filter(hotel_id=self.kwargs['hotel_id']).order_by('-created_at')
        return queryset
