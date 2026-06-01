import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../providers/auth_provider.dart';
import '../../../services/api_service.dart';
import '../../../models/user.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _apiService = ApiService();
  bool _notificationsEnabled = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _notificationsEnabled = prefs.getBool('notification_enabled') ?? true;
    });
  }

  Future<void> _saveNotifications(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notification_enabled', enabled);
    setState(() {
      _notificationsEnabled = enabled;
    });
  }

  Future<void> _showEditProfileDialog(AuthProvider authProvider) async {
    final nameController = TextEditingController(text: authProvider.user?.name ?? '');
    final emailController = TextEditingController(text: authProvider.user?.email ?? '');
    final currencyController = TextEditingController(text: authProvider.user?.currency ?? 'USD');

    final formKey = GlobalKey<FormState>();
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit Profile'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Name'),
                validator: (value) => value == null || value.isEmpty ? 'Name is required' : null,
              ),
              TextFormField(
                controller: emailController,
                decoration: const InputDecoration(labelText: 'Email'),
                keyboardType: TextInputType.emailAddress,
                validator: (value) => value == null || value.isEmpty ? 'Email is required' : null,
              ),
              TextFormField(
                controller: currencyController,
                decoration: const InputDecoration(labelText: 'Currency (USD, INR, EUR)'),
                textCapitalization: TextCapitalization.characters,
                validator: (value) => value == null || value.length != 3 ? 'Enter 3-letter code' : null,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              if (!formKey.currentState!.validate()) return;
              final body = {
                'name': nameController.text.trim(),
                'email': emailController.text.trim(),
                'currency': currencyController.text.trim().toUpperCase(),
              };
              try {
                final response = await _apiService.put('/profile', body: body);
                if (response.statusCode == 200) {
                  final data = response.body.isNotEmpty ? response.body : '{}';
                  final userJson = data.contains('user') ? Map<String, dynamic>.from(jsonDecode(data)['user']) : null;
                  if (userJson != null) {
                    authProvider.updateUser(User.fromJson(userJson));
                  }
                  Navigator.pop(context, true);
                } else {
                  final message = (response.body.isNotEmpty ? jsonDecode(response.body)['message'] : null) ?? 'Failed to update profile';
                  setState(() => _error = message);
                }
              } catch (e) {
                setState(() => _error = 'Failed to update profile: $e');
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );

    if (result == true && mounted) {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          Center(
            child: Column(
              children: [
                CircleAvatar(
                  radius: 50,
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  child: Text(
                    (authProvider.user?.name ?? 'U')[0].toUpperCase(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  authProvider.user?.name ?? 'User',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  authProvider.user?.email ?? '',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.grey,
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          if (_error != null) ...[
            Text(_error!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 16),
          ],
          Card(
            child: ListTile(
              leading: const Icon(Icons.person),
              title: const Text('Edit Profile'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => _showEditProfileDialog(authProvider),
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.attach_money),
              title: const Text('Currency Preference'),
              subtitle: Text(authProvider.user?.currency ?? 'USD'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => _showEditProfileDialog(authProvider),
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: SwitchListTile(
              title: const Text('Notification Settings'),
              value: _notificationsEnabled,
              secondary: const Icon(Icons.notifications),
              onChanged: (value) => _saveNotifications(value),
            ),
          ),
          const SizedBox(height: 24),
          Card(
            child: ListTile(
              leading: Icon(
                Icons.logout,
                color: Theme.of(context).colorScheme.error,
              ),
              title: Text(
                'Logout',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.error,
                ),
              ),
              onTap: () async {
                final confirmed = await showDialog<bool>(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Text('Logout'),
                    content: const Text('Are you sure you want to logout?'),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context, false),
                        child: const Text('Cancel'),
                      ),
                      TextButton(
                        onPressed: () => Navigator.pop(context, true),
                        child: const Text('Logout'),
                      ),
                    ],
                  ),
                );

                if (confirmed == true && context.mounted) {
                  await authProvider.logout();
                }
              },
            ),
          ),
        ],
      ),
    );
  }
}
