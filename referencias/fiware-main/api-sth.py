from datetime import datetime
from zoneinfo import ZoneInfo

import dash
import plotly.graph_objs as go
import requests
from dash import dcc, html, no_update
from dash.dependencies import Input, Output, State

# Constants for IP and port
IP_ADDRESS = "ip do servidor"
PORT_STH = 8666
DASH_HOST = "0.0.0.0"  # Set this to "0.0.0.0" to allow access from any IP

LAST_N = 30            # Points requested from STH on each refresh
MAX_POINTS = 100       # Points kept on screen (sliding window)
REFRESH_MS = 3 * 1000  # Refresh interval in milliseconds
LISBON = ZoneInfo("Europe/Lisbon")


# Function to get luminosity data from the API
def get_luminosity_data(last_n):
    url = (f"http://{IP_ADDRESS}:{PORT_STH}/STH/v1/contextEntities/type/Lamp/"
           f"id/urn:ngsi-ld:Lamp:001/attributes/luminosity?lastN={last_n}")
    headers = {
        'fiware-service': 'smart',
        'fiware-servicepath': '/'
    }
    try:
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()
        return data['contextResponses'][0]['contextElement']['attributes'][0]['values']
    except (requests.RequestException, KeyError, IndexError, ValueError) as e:
        print(f"Error fetching data: {e}")
        return []


# Convert a UTC ISO timestamp (e.g. 2026-09-21T14:45:04.123Z) to Lisbon time
def to_lisbon(timestamp):
    return datetime.fromisoformat(timestamp.replace('Z', '+00:00')).astimezone(LISBON)


app = dash.Dash(__name__)

app.layout = html.Div([
    html.H1('Luminosity Data Viewer'),
    dcc.Graph(id='luminosity-graph'),
    # Store holds {recvTime (UTC): value} so repeated points are not duplicated
    dcc.Store(id='luminosity-data-store', data={}),
    dcc.Interval(id='interval-component', interval=REFRESH_MS, n_intervals=0)
])


@app.callback(
    Output('luminosity-data-store', 'data'),
    Input('interval-component', 'n_intervals'),
    State('luminosity-data-store', 'data')
)
def update_data_store(n, stored_data):
    new_data = get_luminosity_data(LAST_N)
    if not new_data:
        return no_update

    # Merge by timestamp: existing points are overwritten, not duplicated
    for entry in new_data:
        try:
            stored_data[entry['recvTime']] = float(entry['attrValue'])
        except (KeyError, ValueError):
            continue

    # Keep only the most recent MAX_POINTS, in chronological order
    newest = sorted(stored_data.items())[-MAX_POINTS:]
    return dict(newest)


@app.callback(
    Output('luminosity-graph', 'figure'),
    Input('luminosity-data-store', 'data')
)
def update_graph(stored_data):
    if not stored_data:
        return go.Figure(layout={'title': 'Waiting for data...'})

    points = sorted(stored_data.items())
    timestamps = [to_lisbon(ts) for ts, _ in points]
    values = [v for _, v in points]
    mean_luminosity = sum(values) / len(values)

    fig = go.Figure([
        go.Scatter(x=timestamps, y=values, mode='lines+markers',
                   name='Luminosity', line=dict(color='orange')),
        go.Scatter(x=[timestamps[0], timestamps[-1]],
                   y=[mean_luminosity, mean_luminosity], mode='lines',
                   name=f'Mean ({mean_luminosity:.1f})',
                   line=dict(color='blue', dash='dash')),
    ])
    fig.update_layout(
        title=f'Luminosity Over Time — last: {values[-1]:.0f}',
        xaxis_title='Timestamp (Lisbon)',
        yaxis_title='Luminosity',
        yaxis_range=[-5, 105],
        hovermode='x unified',
        uirevision='keep',  # keeps zoom/pan between refreshes
    )
    return fig


if __name__ == '__main__':
    app.run(debug=False, host=DASH_HOST, port=8050)
