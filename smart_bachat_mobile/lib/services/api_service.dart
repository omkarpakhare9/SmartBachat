import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  String? _token;
  
  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString(AppConfig.tokenKey);
  }

  Future<void> setToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConfig.tokenKey, token);
  }

  Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConfig.tokenKey);
    await prefs.remove(AppConfig.userKey);
  }

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_token != null) 'Authorization': 'Bearer $_token',
  };

  Future<http.Response> get(String endpoint) async {
    final url = Uri.parse('${AppConfig.baseUrl}$endpoint');
    return http.get(url, headers: _headers).timeout(
      const Duration(milliseconds: AppConfig.connectionTimeout),
    );
  }

  Future<http.Response> post(String endpoint, {Map<String, dynamic>? body}) async {
    final url = Uri.parse('${AppConfig.baseUrl}$endpoint');
    return http.post(
      url,
      headers: _headers,
      body: body != null ? jsonEncode(body) : null,
    ).timeout(
      const Duration(milliseconds: AppConfig.connectionTimeout),
    );
  }

  Future<http.Response> put(String endpoint, {Map<String, dynamic>? body}) async {
    final url = Uri.parse('${AppConfig.baseUrl}$endpoint');
    return http.put(
      url,
      headers: _headers,
      body: body != null ? jsonEncode(body) : null,
    ).timeout(
      const Duration(milliseconds: AppConfig.connectionTimeout),
    );
  }

  Future<http.Response> delete(String endpoint) async {
    final url = Uri.parse('${AppConfig.baseUrl}$endpoint');
    return http.delete(url, headers: _headers).timeout(
      const Duration(milliseconds: AppConfig.connectionTimeout),
    );
  }

  Future<http.Response> upload(String endpoint, String filePath) async {
    final url = Uri.parse('${AppConfig.baseUrl}$endpoint');
    final request = http.MultipartRequest('POST', url);
    
    request.files.add(await http.MultipartFile.fromPath('receipt', filePath));
    request.headers['Authorization'] = 'Bearer $_token';
    
    final response = await request.send().timeout(
      const Duration(milliseconds: AppConfig.connectionTimeout),
    );
    
    return http.Response.fromStream(response);
  }
}
