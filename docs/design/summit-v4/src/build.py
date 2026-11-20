import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from parts import *
OUT = os.path.join(os.path.dirname(__file__), '..')
def w(name, html): open(os.path.join(OUT, name), 'w').write(html)
A='t-mona g-porcelain c-line'; B='t-inst g-frost c-soft'
w('A-home-desktop.html', home_desktop(A, ann='light'))
w('B-home-desktop.html', home_desktop(B, white_side=True, ann='tint'))
w('A-home-phone.html', home_phone(A,'light'))
w('B-home-phone.html', home_phone(B,'tint'))
w('A-day-desktop.html', day_desktop(A))
w('B-day-desktop.html', day_desktop(B))
from pages import *
w('01-type-options.html', type_options())
w('02-ground-options.html', ground_options())
w('03-cards.html', cards_page())
w('04-sidebar.html', sidebar_page())
w('system-sheet.html', system_sheet())
w('05-forms.html', forms_page())
