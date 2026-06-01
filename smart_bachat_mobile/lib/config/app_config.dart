import 'dart:io';

class AppConfig {
  // API Configuration
  static String get baseUrl {
    const envUrl = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    if (envUrl.isNotEmpty) return envUrl;
    
    // Default based on platform
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:5000/api'; // Android emulator
    } else {
      return 'http://localhost:5000/api'; // Web, iOS, desktop
    }
  }
  
  static const String apiVersion = '/v1';
  
  // App Configuration
  static const String appName = 'SmartBachat';
  static const String appVersion = '1.0.0';
  
  // Storage Keys
  static const String tokenKey = 'auth_token';
  static const String userKey = 'user_data';
  
  // Timeout durations
  static const int connectionTimeout = 30000; // 30 seconds
  static const int receiveTimeout = 30000; // 30 seconds
}
