class User {
  final String id;
  final String email;
  final String? name;
  final String? currency;
  final DateTime createdAt;

  User({
    required this.id,
    required this.email,
    this.name,
    this.currency,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['_id'] ?? json['id'],
      email: json['email'],
      name: json['name'],
      currency: json['currency'],
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'currency': currency,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
