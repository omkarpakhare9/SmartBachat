import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/user.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  
  User? _user;
  bool _isLoading = false;
  String? _error;

  User? get user => _user;
  bool get isAuthenticated => _user != null;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<bool> register(String email, String password, String name) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.post('/auth/register', body: {
        'email': email,
        'password': password,
        'name': name,
      });

      if (response.statusCode == 201) {
        final data = _decodeResponse(response);
        final token = data['token'];
        await _apiService.setToken(token);
        
        _user = User.fromJson(data['user']);
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = _extractErrorMessage(response);
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.post('/auth/login', body: {
        'email': email,
        'password': password,
      });

      if (response.statusCode == 200) {
        final data = _decodeResponse(response);
        final token = data['token'];
        await _apiService.setToken(token);
        
        _user = User.fromJson(data['user']);
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = _extractErrorMessage(response);
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _apiService.clearToken();
    _user = null;
    notifyListeners();
  }

  Future<bool> checkAuth() async {
    await _apiService.init();
    
    try {
      final response = await _apiService.get('/auth/me');
      
      if (response.statusCode == 200) {
        final data = _decodeResponse(response);
        _user = User.fromJson(data['user']);
        notifyListeners();
        return true;
      } else {
        await _apiService.clearToken();
        return false;
      }
    } catch (e) {
      await _apiService.clearToken();
      return false;
    }
  }

  dynamic _decodeResponse(http.Response response) {
    if (response.body.isEmpty) return {};
    try {
      return json.decode(response.body);
    } catch (e) {
      return {};
    }
  }

  String _extractErrorMessage(http.Response response) {
    try {
      final data = json.decode(response.body);
      return data['message'] ?? data['error'] ?? 'An error occurred';
    } catch (e) {
      return 'An error occurred';
    }
  }
}
