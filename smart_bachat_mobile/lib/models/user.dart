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
    DateTime parsedCreatedAt;
    final rawCreatedAt = json['createdAt'];
    if (rawCreatedAt == null) {
      parsedCreatedAt = DateTime.now();
    } else if (rawCreatedAt is String) {
      parsedCreatedAt = DateTime.tryParse(rawCreatedAt) ?? DateTime.now();
    } else if (rawCreatedAt is int) {
      parsedCreatedAt = DateTime.fromMillisecondsSinceEpoch(rawCreatedAt);
    } else {
      parsedCreatedAt = DateTime.now();
    }

    return User(
      id: (json['_id'] ?? json['id']).toString(),
      email: json['email']?.toString() ?? '',
      name: json['name']?.toString(),
      currency: json['currency']?.toString(),
      createdAt: parsedCreatedAt,
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
