import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../providers/auth_provider.dart';
import '../../../services/api_service.dart';
import '../../../models/user.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/money_decorations.dart';

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
      appBar: const GradientAppBar(title: 'Profile'),
      body: MoneyBackground(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
          children: [
            Container(
              padding: const EdgeInsets.symmetric(vertical: 26, horizontal: 16),
              decoration: BoxDecoration(
                gradient: AppColors.walletGradient,
                borderRadius: BorderRadius.circular(22),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withOpacity(0.3),
                    blurRadius: 16,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: AppColors.goldGradient,
                    ),
                    child: CircleAvatar(
                      radius: 44,
                      backgroundColor: Colors.white,
                      child: Text(
                        (authProvider.user?.name ?? 'U')[0].toUpperCase(),
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontSize: 32,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    authProvider.user?.name ?? 'User',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    authProvider.user?.email ?? '',
                    style: const TextStyle(color: Colors.white70),
                  ),
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.18),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '💰 ${authProvider.user?.currency ?? 'USD'} preferred',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            if (_error != null) ...[
              Text(_error!, style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 16),
            ],
            _settingsTile(
              icon: Icons.person,
              iconColor: AppColors.primary,
              title: 'Edit Profile',
              subtitle: 'Update name, email & currency',
              onTap: () => _showEditProfileDialog(authProvider),
            ),
            const SizedBox(height: 10),
            _settingsTile(
              icon: Icons.attach_money,
              iconColor: AppColors.accentDark,
              title: 'Currency Preference',
              subtitle: authProvider.user?.currency ?? 'USD',
              onTap: () => _showEditProfileDialog(authProvider),
            ),
            const SizedBox(height: 10),
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: SwitchListTile(
                title: const Text('Notification Settings',
                    style: TextStyle(fontWeight: FontWeight.w700)),
                value: _notificationsEnabled,
                secondary: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    gradient: AppColors.balanceGradient,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.notifications, color: Colors.white),
                ),
                onChanged: (value) => _saveNotifications(value),
                activeColor: AppColors.primary,
              ),
            ),
            const SizedBox(height: 24),
            _settingsTile(
              icon: Icons.logout,
              iconColor: AppColors.rose,
              title: 'Logout',
              subtitle: 'Sign out of your account',
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
          ],
        ),
      ),
    );
  }

  Widget _settingsTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [iconColor.withOpacity(0.85), iconColor],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: Colors.white),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary)),
                  Text(subtitle,
                      style: const TextStyle(
                          color: AppColors.textSecondary, fontSize: 12)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.textSecondary),
          ],
        ),
      ),
    );
  }
}
