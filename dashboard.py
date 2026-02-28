
from flask import Blueprint, jsonify
from ..auth import login_required

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/v1/dashboard')

@dashboard_bp.route('/kpis', methods=['GET'])
@login_required
def get_kpis(current_user):
    # In a real application, you would fetch these from your database
    kpis = {
        'total_orders': 125,
        'active_orders': 20,
        'total_customers': 75,
        'open_tickets': 10
    }
    return jsonify(kpis)
