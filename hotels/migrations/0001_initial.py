from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name='Hotel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=180)),
                ('city', models.CharField(max_length=100)),
                ('country', models.CharField(max_length=100)),
                ('rating', models.DecimalField(decimal_places=1, default=4.5, max_digits=2)),
                ('review_count', models.PositiveIntegerField(default=0)),
                ('price', models.PositiveIntegerField()),
                ('image', models.URLField()),
                ('tags', models.JSONField(default=list)),
                ('description', models.TextField()),
            ],
        ),
        migrations.CreateModel(
            name='Booking',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('confirmation_code', models.CharField(max_length=20, unique=True)),
                ('guest_name', models.CharField(max_length=160)),
                ('email', models.EmailField(max_length=254)),
                ('check_in', models.DateField()),
                ('check_out', models.DateField()),
                ('guests', models.PositiveSmallIntegerField(default=1)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('hotel', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='bookings', to='hotels.hotel')),
            ],
        ),
    ]
