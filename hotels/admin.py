import os

from django.contrib import admin
from django.db.models import CharField, F, Q
from django.db.models.functions import Cast

from .models import Booking, GuestProfile, Hotel, HotelImage, Payment, Promotion, Refund, Review, Room

admin.site.site_url = os.getenv('FRONTEND_URL', 'http://127.0.0.1:5173/')


def admin_with_all_fields(model):
	class AllFieldsAdmin(admin.ModelAdmin):
		list_display = tuple(field.name for field in model._meta.fields)
		search_fields = ('id',)
		list_per_page = 50

		def get_search_results(self, request, queryset, search_term):
			if not search_term:
				return queryset, False

			annotations = {
				f'_admin_search_{field.name}': Cast(F(field.name), output_field=CharField())
				for field in model._meta.fields
			}
			queryset = queryset.annotate(**annotations)
			filters = Q()
			for field in model._meta.fields:
				filters |= Q(**{f'_admin_search_{field.name}__icontains': search_term})
			return queryset.filter(filters), False

	return AllFieldsAdmin


for model in (Hotel, HotelImage, Booking, Room, GuestProfile, Promotion, Payment, Refund, Review):
	admin.site.register(model, admin_with_all_fields(model))
