import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/report_provider.dart';
import '../../providers/transaction_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/money_decorations.dart';
import 'transactions/transactions_screen.dart';
import 'transactions/add_edit_transaction_screen.dart';
import 'budgets/budgets_screen.dart';
import 'reports/reports_screen.dart';
import 'profile/profile_screen.dart';
import 'splits/splits_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const HomeTab(),
    const TransactionsScreen(),
    const BudgetsScreen(),
    const ReportsScreen(),
    const ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      body: _screens[_currentIndex],
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
          borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
        ),
        child: ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
          child: BottomNavigationBar(
            currentIndex: _currentIndex,
            onTap: (index) {
              setState(() {
                _currentIndex = index;
              });
            },
            type: BottomNavigationBarType.fixed,
            items: const [
              BottomNavigationBarItem(
                icon: Icon(Icons.home_outlined),
                activeIcon: Icon(Icons.home_rounded),
                label: 'Home',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.receipt_long_outlined),
                activeIcon: Icon(Icons.receipt_long_rounded),
                label: 'Transactions',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.savings_outlined),
                activeIcon: Icon(Icons.savings_rounded),
                label: 'Budgets',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.analytics_outlined),
                activeIcon: Icon(Icons.analytics_rounded),
                label: 'Reports',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.person_outline),
                activeIcon: Icon(Icons.person_rounded),
                label: 'Profile',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class HomeTab extends StatefulWidget {
  const HomeTab({super.key});

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  bool _isInitialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_isInitialized) {
      final reportProvider =
          Provider.of<ReportProvider>(context, listen: false);
      final txProvider =
          Provider.of<TransactionProvider>(context, listen: false);
      reportProvider.fetchSummary();
      txProvider.fetchTransactions();
      _isInitialized = true;
    }
  }

  String _format(num? value) {
    if (value == null) return '0.00';
    return NumberFormat('#,##0.00').format(value);
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final reportProvider = Provider.of<ReportProvider>(context);
    final txProvider = Provider.of<TransactionProvider>(context);
    final summary = reportProvider.summary;
    final currency = authProvider.user?.currency ?? 'INR';
    final symbol = _currencySymbol(currency);

    final income = summary['displayIncome'] ?? _format(summary['income'] as num?);
    final expense =
        summary['displayExpense'] ?? _format(summary['expense'] as num?);
    final balance =
        summary['displayBalance'] ?? _format(summary['balance'] as num?);

    return MoneyBackground(
      child: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async {
            await reportProvider.fetchSummary();
            await txProvider.fetchTransactions();
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(18, 18, 18, 110),
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Hello 👋',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        authProvider.user?.name ?? 'User',
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                  Stack(
                    children: [
                      Container(
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withOpacity(0.4),
                              blurRadius: 12,
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        child: CircleAvatar(
                          radius: 24,
                          backgroundColor: Colors.transparent,
                          child: Text(
                            (authProvider.user?.name ?? 'U')[0].toUpperCase(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                              fontSize: 18,
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        right: 0,
                        bottom: 0,
                        child: Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            color: AppColors.accent,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 20),
              WalletCard(
                balance: balance.toString(),
                currencySymbol: symbol,
                income: income.toString(),
                expense: expense.toString(),
                ownerName: authProvider.user?.name,
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: GradientStatCard(
                      title: 'Income',
                      amount: '$symbol $income',
                      icon: Icons.trending_up,
                      gradient: AppColors.incomeGradient,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: GradientStatCard(
                      title: 'Expenses',
                      amount: '$symbol $expense',
                      icon: Icons.trending_down,
                      gradient: AppColors.expenseGradient,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              GradientStatCard(
                title: 'Net Savings',
                amount: '$symbol $balance',
                subtitle: 'Keep it green to grow your wealth',
                icon: Icons.savings,
                gradient: AppColors.balanceGradient,
              ),
              const SizedBox(height: 24),
              const Text(
                'Quick Actions',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 14,
                crossAxisSpacing: 14,
                childAspectRatio: 1.15,
                children: [
                  QuickActionTile(
                    title: 'Add Transaction',
                    icon: Icons.add_circle,
                    color: AppColors.primary,
                    onTap: () async {
                      final result = await Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const AddEditTransactionScreen()),
                      );
                      if (result == true) {
                        Provider.of<TransactionProvider>(context, listen: false)
                            .fetchTransactions();
                        Provider.of<ReportProvider>(context, listen: false)
                            .fetchSummary();
                      }
                    },
                  ),
                  QuickActionTile(
                    title: 'Set Budget',
                    icon: Icons.savings,
                    color: AppColors.accentDark,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const BudgetsScreen()),
                      );
                    },
                  ),
                  QuickActionTile(
                    title: 'View Reports',
                    icon: Icons.analytics,
                    color: AppColors.sky,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const ReportsScreen()),
                      );
                    },
                  ),
                  QuickActionTile(
                    title: 'Split Expense',
                    icon: Icons.group,
                    color: AppColors.violet,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const SplitsScreen()),
                      );
                    },
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Recent Transactions',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 18,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  TextButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const TransactionsScreen()),
                      );
                    },
                    child: const Text(
                      'See all',
                      style: TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              if (txProvider.transactions.isEmpty)
                _EmptyTransactions()
              else
                ...txProvider.transactions.take(5).map((t) {
                  final isIncome = t.type == 'income';
                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            gradient: isIncome
                                ? AppColors.incomeGradient
                                : AppColors.expenseGradient,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Icon(
                            isIncome
                                ? Icons.arrow_downward
                                : Icons.arrow_upward,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                t.description,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                ),
                              ),
                              Text(
                                '${t.categoryName ?? ''} • ${DateFormat.yMMMd().format(t.date)}',
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          '${isIncome ? '+' : '-'}$symbol ${t.amount.toStringAsFixed(2)}',
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            color: isIncome
                                ? AppColors.primary
                                : AppColors.rose,
                          ),
                        ),
                      ],
                    ),
                  );
                }),
            ],
          ),
        ),
      ),
    );
  }

  String _currencySymbol(String code) {
    switch (code.toUpperCase()) {
      case 'INR':
        return '₹';
      case 'USD':
        return '\$';
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      default:
        return code;
    }
  }
}

class _EmptyTransactions extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          const CashBillIllustration(size: 120),
          const SizedBox(height: 8),
          const Text(
            'No transactions yet',
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 16,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Tap “Add Transaction” to log your first entry.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}
