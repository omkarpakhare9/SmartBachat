# SmartBachat Mobile App

Flutter mobile application for SmartBachat expense tracker.

## Tech Stack

- **Flutter**: Cross-platform mobile development framework
- **Provider**: State management
- **HTTP**: API communication
- **SharedPreferences**: Local storage
- **FL Chart**: Charts and graphs
- **Image Picker**: Receipt uploads

## Features

- User authentication (login/register)
- Dashboard with summary cards
- Transaction management (add, edit, delete)
- Budget tracking and alerts
- Category management
- Reports with charts
- Profile management
- Receipt uploads
- Multi-currency support

## Prerequisites

- Flutter SDK (3.0.0 or higher)
- Android Studio / VS Code with Flutter extension
- Android SDK (API 21 or higher)

## Setup

1. Navigate to the mobile app directory:
```bash
cd smart_bachat_mobile
```

2. Install dependencies:
```bash
flutter pub get
```

3. Configure API endpoint:
```bash
# For local development
flutter run --dart-define=API_BASE_URL=http://localhost:5000/api

# For production
flutter run --dart-define=API_BASE_URL=https://your-api-domain.com/api
```

## Running the App

### Android Emulator/Device
```bash
flutter run
```

### Debug Mode
```bash
flutter run --debug
```

### Release Mode
```bash
flutter run --release
```

## Build APK

```bash
flutter build apk --release
```

The APK will be located at: `build/app/outputs/flutter-apk/app-release.apk`

## Project Structure

```
lib/
├── config/           # App configuration
├── models/           # Data models (User, Transaction, Category, Budget)
├── providers/        # State management (AuthProvider, etc.)
├── screens/          # UI screens
│   ├── auth/        # Login, Register
│   └── dashboard/   # Dashboard, Transactions, Budgets, Reports, Profile
└── services/         # API service, storage service
```

## API Integration

The mobile app connects to the existing backend API:
- Authentication: `/api/auth/*`
- Transactions: `/api/transactions`
- Categories: `/api/categories`
- Budgets: `/api/budgets`
- Reports: `/api/reports/*`
- Currencies: `/api/currencies/*`

## Environment Variables

- `API_BASE_URL`: Backend API base URL (default: `http://localhost:5000/api`)

## Notes

- The mobile app shares the same backend as the web application
- All API calls are authenticated using JWT tokens
- Data is cached locally using SharedPreferences
- The app follows Material Design 3 guidelines
