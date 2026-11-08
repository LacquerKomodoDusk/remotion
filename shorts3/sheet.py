import sys
from PIL import Image, ImageDraw
name=sys.argv[1]; fr=[int(x) for x in sys.argv[2:]]; W,H=300,533
S=Image.new('RGB',(W*len(fr),H)); d=ImageDraw.Draw(S)
for i,f in enumerate(fr):
  x=i*W; S.paste(Image.open(f'stills/{name}_{f}.png').convert('RGB').resize((W,H)),(x,0)); d.text((x+5,5),f'{f/60:.2f}',fill=(255,0,0))
  d.rectangle([x,53,x+W-1,426],outline=(255,0,255)); d.line([x+255,0,x+255,H],fill=(255,0,255))
S.save(f'stills/sheet_{name}.jpg',quality=86)
