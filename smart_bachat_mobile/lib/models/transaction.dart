class Transaction {
  final String id;
  final String type; // 'income' or 'expense'
  final double amount;
  final String categoryId;
  final String? categoryName;
  final String? categoryIcon;
  final String? categoryColor;
  final String description;
  final DateTime date;
  final String? receiptUrl;
  final double? displayAmount;
  final String? displayCurrency;

  Transaction({
    required this.id,
    required this.type,
    required this.amount,
    required this.categoryId,
    this.categoryName,
    this.categoryIcon,
    this.categoryColor,
    required this.description,
    required this.date,
    this.receiptUrl,
    this.displayAmount,
    this.displayCurrency,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['_id'] ?? json['id'],
      type: json['type'],
      amount: (json['amount'] is num) ? (json['amount'] as num).toDouble() : double.parse(json['amount'].toString()),
      categoryId: json['category']?['_id'] ?? json['categoryId'] ?? '',
      categoryName: json['category']?['name'] ?? json['categoryName'],
      categoryIcon: json['category']?['icon'] ?? json['categoryIcon'],
      categoryColor: json['category']?['color'] ?? json['categoryColor'],
      description: json['description'] ?? '',
      date: DateTime.parse(json['date'] ?? DateTime.now().toIso8601String()),
      receiptUrl: json['receiptUrl'],
      displayAmount: json['displayAmount'] != null 
          ? (json['displayAmount'] is num) 
              ? (json['displayAmount'] as num).toDouble() 
              : double.parse(json['displayAmount'].toString())
          : null,
      displayCurrency: json['displayCurrency'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'amount': amount,
      'category': categoryId,
      'description': description,
      'date': date.toIso8601String(),
    };
  }
}
